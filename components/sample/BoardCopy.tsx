"use client";

import { useBoard } from "@/lib/hooks/useBoards";
import { ColumnWithTasks, Task } from "@/lib/supabase/models";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  closestCorners,
  rectIntersection,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

// type Task = {
//   id: string;
//   title: string;
// };

// type Column = {
//   id: string;
//   title: string;
//   tasks: Task[];
// };

function Card({ card }: { card: Task }) {
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={`
        p-4 bg-white rounded shadow
        touch-manipulation
        h-50
        ${isDragging ? "opacity-30 scale-[0.98]" : ""}
      `}
    >
      <span
        {...listeners}
        className="cursor-grab touch-manipulation inline-flex"
      >
        <GripVertical size={18} />
      </span>

      <p>{card.title}</p>
    </div>
  );
}
function Column({
  column,
  onAddCard,
}: {
  column: ColumnWithTasks;
  onAddCard: (columnId: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id, // 👈 THIS is the fix
  });

  return (
    <div
      ref={setNodeRef}
      className="w-72 shrink-0 snap-start bg-gray-100 rounded p-3 flex flex-col"
    >
      <h2 className="font-semibold mb-2">{column.title}</h2>

      {/* 👇 FULL HEIGHT DROPPABLE ZONE */}
      <div
        ref={setNodeRef}
        className={`
          flex-1
          space-y-2
          min-h-[200px]
          rounded
          transition
        `}
      >
        <SortableContext
          items={column.tasks.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2 min-h-[60px] touch-none">
            {column.tasks.map((tasks) => (
              <Card key={tasks.created_at} card={tasks} />
            ))}
          </div>
        </SortableContext>
      </div>

      <button
        onClick={() => onAddCard(column.id)}
        className="mt-2 text-sm text-gray-600 hover:text-black w-full text-left py-2"
      >
        + Add Card
      </button>
    </div>
  );
}

// const initialData: ColumnWithTasks[] = [
//   {
//     id: "todo",
//     title: "Todo",
//     tasks: [
//       { id: "c1", title: "Buy milk" },
//       { id: "c2", title: "Clean room" },
//     ],
//   },
//   {
//     id: "doing",
//     title: "Doing",
//     tasks: [{ id: "c3", title: "Learn dnd-kit" }],
//   },
//   {
//     id: "done",
//     title: "Done",
//     tasks: [{ id: "c4", title: "Setup Next.js" }],
//   },
// ];

export default function Board() {
  const { id } = useParams<{ id: string }>();
  // const [columns, setColumns] = useState<Column[]>(initialData);
  const [activeCard, setActiveCard] = useState<Task | null>(null);
  const {
    board,
    createColumn,
    updateBoard,
    columns,
    createRealTask,
    setColumns,
    moveTask,
    updateColumn,
    loading,
  } = useBoard(id);

  const findColumn = (cardId: string) =>
    columns.find((col) => col.tasks.some((card) => card.id === cardId));
  const generateId = () => crypto.randomUUID();

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeColumn = findColumn(activeId);
    const overColumn =
      columns.find((col) => col.id === overId) || findColumn(overId);

    if (!activeColumn || !overColumn) return;

    // 🚫 VERY IMPORTANT GUARD
    if (activeColumn.id === overColumn.id) return;

    setColumns((prev) => {
      const next = structuredClone(prev);

      const fromCol = next.find((c) => c.id === activeColumn.id)!;
      const toCol = next.find((c) => c.id === overColumn.id)!;

      // 🛑 CARD ALREADY MOVED → DO NOTHING
      if (toCol.tasks.some((c) => c.id === activeId)) {
        return prev;
      }

      const cardIndex = fromCol.tasks.findIndex((c) => c.id === activeId);
      const [movedCard] = fromCol.tasks.splice(cardIndex, 1);

      toCol.tasks.push(movedCard);

      return next;
    });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const targetColumn = columns.find((col) => col.id === overId);
    const column = findColumn(activeId);
    if (!column) return;

    const oldIndex = column.tasks.findIndex((c) => c.id === activeId);
    const newIndex = column.tasks.findIndex((c) => c.id === overId);

    if (oldIndex !== newIndex) {
      // await moveTask(activeId, targetColumn.id, newIndex);
      setColumns((prev) => {
        const next = structuredClone(prev);
        const col = next.find((c) => c.id === column.id)!;
        col.tasks = arrayMove(col.tasks, oldIndex, newIndex);
        console.log({next, col});
        
        return next;
      });
    }
  };

  // useEffect(() => {
  //   console.log({ columns });
  // }, [columns]);

  const addColumn = () => {
    // TO DO
    // setColumns((prev) => [
    //   ...prev,
    //   {
    //     id: generateId(),
    //     title: `New Column`,
    //     cards: [],
    //   },
    // ]);
  };

  const addCard = (columnId: string) => {
    setColumns((prev) => {
      const next = structuredClone(prev);
      const column = next.find((c) => c.id === columnId);
      if (!column) return prev;

      // TO DO
      // column.cards.push({
      //   id: generateId(),
      //   title: "New Card",
      // });

      return next;
    });
  };

  const sensors = useSensors(
    // Desktop / mouse
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),

    // Mobile / touch (LONG PRESS)
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 300,
        tolerance: 8,
      },
    }),
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={rectIntersection}
      onDragStart={({ active }) => {
        const card = columns
          .flatMap((col) => col.tasks)
          .find((c) => c.id === active.id);

        if (card) setActiveCard(card);
      }}
      onDragOver={handleDragOver}
      onDragEnd={(event) => {
        handleDragEnd(event);
        setActiveCard(null);
      }}
      onDragCancel={() => setActiveCard(null)}
    >
      <div className="flex gap-4 p-4 overflow-x-auto overscroll-x-contain snap-x snap-mandatory ">
        {columns.map((column) => (
          <Column key={column.created_at} column={column} onAddCard={addCard} />
        ))}

        <button
          onClick={addColumn}
          className="
            min-w-[18rem]
            h-fit
            p-4
            rounded
            bg-gray-200
            hover:bg-gray-300
            text-sm
            shrink-0
          "
        >
          + Add Column
        </button>
      </div>
      <DragOverlay>
        {activeCard ? (
          <div
            className="p-3 bg-white rounded shadow-lg w-72"
            style={{ pointerEvents: "none" }} // 👈 REQUIRED
          >
            {activeCard.title}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
