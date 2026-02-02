"use client";

import { useBoard } from "@/lib/hooks/useBoards";
import {
  ColumnWithTasks,
  Task,
  Column as ColumnProps,
} from "@/lib/supabase/models";
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

// type Card = {
//   id: string;
//   title: string;
// };

// type Column = {
//   id: string;
//   title: string;
//   cards: Card[];
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
        min-h-50
        touch-manipulation
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
        className={`
          flex-1
          space-y-2
          min-h-[200px]
          rounded
          transition
          ${isOver ? "bg-blue-100/40" : ""}
        `}
      >
        <SortableContext
          items={column.tasks?.filter(Boolean).map((c) => c.id) ?? []}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2 min-h-[60px] touch-none">
            {column.tasks?.filter(Boolean).map((card) => (
              <Card key={card.id} card={card} />
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

// const initialData: Column[] = [
//   {
//     id: "todo",
//     title: "Todo",
//     cards: [
//       { id: "c1", title: "Buy milk" },
//       { id: "c2", title: "Clean room" },
//     ],
//   },
//   {
//     id: "doing",
//     title: "Doing",
//     cards: [{ id: "c3", title: "Learn dnd-kit" }],
//   },
//   {
//     id: "done",
//     title: "Done",
//     cards: [{ id: "c4", title: "Setup Next.js" }],
//   },
// ];

export default function Board() {
  const { id } = useParams<{ id: string }>();
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
  // const [columns, setColumns] = useState<ColumnWithTasks[]>([]);
  const [activeCard, setActiveCard] = useState<Task | null>(null);

  // useEffect(() => {
  //   setColumns(columnsData);
  // }, []);

  const findColumn = (cardId: string) =>
    columns.find((col) => col.tasks.some((card) => card.id === cardId));
  const generateId = () => crypto.randomUUID();

  const findColumnByCardId = (cardId: string) =>
    columns.find((col) => col.tasks.some((t) => t.id === cardId));

  const findColumnById = (columnId: string) =>
    columns.find((col) => col.id === columnId);

  const handleDragOver = ({ active, over }: DragOverEvent) => {
    // const { active, over } = event;
    // if (!over) return;
    // const activeId = active.id as string;
    // const overId = over.id as string;
    // const activeColumn = findColumn(activeId);
    // const overColumn =
    //   columns.find((col) => col.id === overId) || findColumn(overId);
    // if (!activeColumn || !overColumn) return;
    // // 🚫 VERY IMPORTANT GUARD
    // if (activeColumn.id === overColumn.id) return;
    // setColumns((prev) => {
    //   const next = structuredClone(prev);
    //   const fromCol = next.find((c) => c.id === activeColumn.id)!;
    //   const toCol = next.find((c) => c.id === overColumn.id)!;
    //   // 🛑 CARD ALREADY MOVED → DO NOTHING
    //   if (toCol.tasks.some((c) => c.id === activeId)) {
    //     return prev;
    //   }
    //   const cardIndex = fromCol.tasks.findIndex((c) => c.id === activeId);
    //   const [movedCard] = fromCol.tasks.splice(cardIndex, 1);
    //   toCol.tasks.push(movedCard);
    //   return next;
    // });

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const fromColumn = findColumnByCardId(activeId);
    const toColumn = findColumnById(overId) || findColumnByCardId(overId);

    if (!fromColumn || !toColumn) return;

    // 🚫 DO NOTHING HERE
    // Let DragOverlay handle visuals
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    // const { active, over } = event;
    // if (!over) return;
    // const activeId = active.id as string;
    // const overId = over.id as string;
    // const column = findColumn(activeId);
    // if (!column) return;
    // const oldIndex = column.tasks.findIndex((c) => c.id === activeId);
    // const newIndex = column.tasks.findIndex((c) => c.id === overId);
    // if (oldIndex !== newIndex) {
    //   setColumns((prev) => {
    //     const next = structuredClone(prev);
    //     const col = next.find((c) => c.id === column.id)!;
    //     col.tasks = arrayMove(col.tasks, oldIndex, newIndex);
    //     return next;
    //   });
    // }

    if (!over) {
      setActiveCard(null);
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    setColumns((prev) => {
      const next = structuredClone(prev);

      const from = next.find((c) => c.tasks.some((t) => t.id === activeId));
      const to =
        next.find((c) => c.id === overId) ||
        next.find((c) => c.tasks.some((t) => t.id === overId));

      if (!from || !to) return prev;

      const fromIndex = from.tasks.findIndex((t) => t.id === activeId);
      if (fromIndex === -1) return prev;

      const [moved] = from.tasks.splice(fromIndex, 1);
      if (!moved) return prev;

      if (from.id === to.id) {
        const toIndex = to.tasks.findIndex((t) => t.id === overId);
        if (toIndex === -1) return prev;

        to.tasks = arrayMove(to.tasks, fromIndex, toIndex);
      } else {
        to.tasks.push(moved);
      }

      return next;
    });

    setActiveCard(null);
  };

  const addColumn = () => {
    // setColumns((prev) => [
    //   ...prev,
    //   {
    //     id: generateId(),
    //     title: `New Column`,
    //     tasks: [],
    //   },
    // ]);
  };

  const addCard = (columnId: string) => {
    setColumns((prev) => {
      const next = structuredClone(prev);
      const column = next.find((c) => c.id === columnId);
      if (!column) return prev;

      // column.tasks.push({
      //   id: generateId(),
      //   title: "New Card",
      // });

      return next;
    });
  };

  const sensors = useSensors(
    // useSensor(PointerSensor, {
    //   activationConstraint: {
    //     distance: 8, // prevents accidental drags
    //   },
    // }),

    // Desktop / mouse
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
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
      // collisionDetection={closestCorners}
      onDragStart={({ active }) => {
        // const card = columns
        //   .flatMap((col) => col.tasks)
        //   .find((c) => c.id === active.id);
        // if (card) setActiveCard(card);

        const card = columns
          .flatMap((c) => c.tasks || [])
          .filter(Boolean)
          .find((t) => t.id === active.id);

        if (card) setActiveCard(card);
      }}
      onDragOver={handleDragOver}
      // onDragEnd={(event) => {
      // handleDragEnd(event);
      // setActiveCard(null);
      // }}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveCard(null)}
    >
      <div className="flex gap-4 p-4 overflow-x-auto overscroll-x-contain snap-x snap-mandatory ">
        {columns.map((column) => (
          <Column key={column.id} column={column} onAddCard={addCard} />
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
            className="p-4 bg-white rounded shadow min-h-50 w-72 touch-manipulation"
            style={{ pointerEvents: "none", transform: "none" }}
          >
            <span className="inline-flex">
              <GripVertical size={18} />
            </span>
            <p>{activeCard.title}</p>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
