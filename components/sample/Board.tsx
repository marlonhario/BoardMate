"use client";

import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  closestCorners,
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
import { useState } from "react";

type Card = {
  id: string;
  title: string;
};

type Column = {
  id: string;
  title: string;
  cards: Card[];
};

function Card({ card }: { card: Card }) {
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
      {...listeners}
      className={`p-4 bg-white rounded shadow cursor-grab active:cursor-grabbing touch-manipulation
        ${isDragging ? "opacity-30 scale-[0.98]" : ""}`}
    >
      <span {...listeners} className="cursor-grab touch-manipulation">
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
  column: Column;
  onAddCard: (columnId: string) => void;
}) {
  const { setNodeRef } = useDroppable({
    id: column.id, // 👈 THIS is the fix
  });

  return (
    <div
      ref={setNodeRef}
      className="w-72 shrink-0 snap-start bg-gray-100 rounded p-3"
    >
      <h2 className="font-semibold mb-2">{column.title}</h2>

      <SortableContext
        items={column.cards.map((c) => c.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2 min-h-[60px]">
          {column.cards.map((card) => (
            <Card key={card.id} card={card} />
          ))}
        </div>
      </SortableContext>

      <button
        onClick={() => onAddCard(column.id)}
        className="mt-2 text-sm text-gray-600 hover:text-black w-full text-left py-2"
      >
        + Add Card
      </button>
    </div>
  );
}

const initialData: Column[] = [
  {
    id: "todo",
    title: "Todo",
    cards: [
      { id: "c1", title: "Buy milk" },
      { id: "c2", title: "Clean room" },
    ],
  },
  {
    id: "doing",
    title: "Doing",
    cards: [{ id: "c3", title: "Learn dnd-kit" }],
  },
  {
    id: "done",
    title: "Done",
    cards: [{ id: "c4", title: "Setup Next.js" }],
  },
];

export default function Board() {
  const [columns, setColumns] = useState<Column[]>(initialData);
  const [activeCard, setActiveCard] = useState<Card | null>(null);

  const findColumn = (cardId: string) =>
    columns.find((col) => col.cards.some((card) => card.id === cardId));
  const generateId = () => crypto.randomUUID();

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeColumn = findColumn(activeId);

    // 👇 over can be a COLUMN id OR a CARD id
    const overColumn =
      columns.find((col) => col.id === overId) || findColumn(overId);

    if (!activeColumn || !overColumn) return;
    if (activeColumn.id === overColumn.id) return;

    setColumns((prev) => {
      const next = structuredClone(prev);

      const fromCol = next.find((c) => c.id === activeColumn.id)!;
      const toCol = next.find((c) => c.id === overColumn.id)!;

      const cardIndex = fromCol.cards.findIndex((c) => c.id === activeId);

      const [movedCard] = fromCol.cards.splice(cardIndex, 1);

      // 👇 works even if toCol.cards is empty
      toCol.cards.push(movedCard);

      return next;
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const column = findColumn(activeId);
    if (!column) return;

    const oldIndex = column.cards.findIndex((c) => c.id === activeId);
    const newIndex = column.cards.findIndex((c) => c.id === overId);

    if (oldIndex !== newIndex) {
      setColumns((prev) => {
        const next = structuredClone(prev);
        const col = next.find((c) => c.id === column.id)!;
        col.cards = arrayMove(col.cards, oldIndex, newIndex);
        return next;
      });
    }
  };

  const addColumn = () => {
    setColumns((prev) => [
      ...prev,
      {
        id: generateId(),
        title: `New Column`,
        cards: [],
      },
    ]);
  };

  const addCard = (columnId: string) => {
    setColumns((prev) => {
      const next = structuredClone(prev);
      const column = next.find((c) => c.id === columnId);
      if (!column) return prev;

      column.cards.push({
        id: generateId(),
        title: "New Card",
      });

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
        distance: 6,
      },
    }),

    // Mobile / touch (LONG PRESS)
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250, // 👈 long press time (ms)
        tolerance: 5, // 👈 finger can move a bit
      },
    }),
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={({ active }) => {
        const card = columns
          .flatMap((col) => col.cards)
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
          <div className="p-3 bg-white rounded shadow-lg w-72">
            {activeCard.title}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
