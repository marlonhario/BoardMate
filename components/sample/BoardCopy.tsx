"use client";

import { useBoard } from "@/lib/hooks/useBoards";
import { ColumnWithTasks } from "@/lib/supabase/models";
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
import { GripVertical, Plus } from "lucide-react";
import { useParams } from "next/navigation";
import { FormEvent, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

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
      className={`
        p-4 bg-white rounded shadow
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
  onCreateTask,
}: {
  column: ColumnWithTasks;
  onAddCard?: (columnId: string) => void;
  onCreateTask: (taskData: FormEvent<HTMLFormElement>) => Promise<void>;
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
          ${isOver ? "bg-blue-100/40" : ""}
        `}
      >
        <SortableContext
          items={column.tasks.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2 min-h-[60px] touch-none">
            {column.tasks.map((task) => (
              <Card key={task.id} card={task} />
            ))}
          </div>
        </SortableContext>
      </div>

      {/* <button
        onClick={() => onAddCard(column.id)}
        className="mt-2 text-sm text-gray-600 hover:text-black w-full text-left py-2"
      >
        + Add Task
      </button> */}
      <Dialog>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            className="w-full mt-3 text-gray-500 hover:text-gray-700"
          >
            <Plus />
            Add Task
          </Button>
        </DialogTrigger>
        <DialogContent className="w-[95vw] max-w-[425px] mx-auto">
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
            <p className="text-sm text-gray-600">Add a task to the board</p>
          </DialogHeader>

          <form className="space-y-4" onSubmit={onCreateTask}>
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input id="title" name="title" placeholder="Enter task title" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Enter task description"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Assignee</Label>
              <Input
                id="assignee"
                name="assignee"
                placeholder="Who should do this?"
              />
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
              <Select name="priority" defaultValue="medium">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["low", "medium", "high"].map((priority, key) => (
                    <SelectItem key={key} value={priority}>
                      {priority.charAt(0).toUpperCase() + priority.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input type="date" id="dueDate" name="dueDate" />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="submit">Create Task</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
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

export default function BoardCopy() {
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
  } = useBoard(id);
  // const [columns, setColumns] = useState<Column[]>(initialData);
  const [activeCard, setActiveCard] = useState<Card | null>(null);

  const findColumn = (cardId: string) =>
    columns.find((col) => col.tasks.some((task) => task.id === cardId));
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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const column = findColumn(activeId);
    if (!column) return;

    const oldIndex = column.tasks.findIndex((c) => c.id === activeId);
    const newIndex = column.tasks.findIndex((c) => c.id === overId);

    if (oldIndex !== newIndex) {
      setColumns((prev) => {
        const next = structuredClone(prev);
        const col = next.find((c) => c.id === column.id)!;
        col.tasks = arrayMove(col.tasks, oldIndex, newIndex);
        return next;
      });
    }
  };

  const addColumn = async () => {
    await createColumn(`New Column`);
    // setColumns((prev) => [
    //   ...prev,
    //   {
    //     id: generateId(),
    //     title: `New Column`,
    //     cards: [],
    //   },
    // ]);
  };

  // const addCard = (columnId: string) => {
  //   setColumns((prev) => {
  //     const next = structuredClone(prev);
  //     const column = next.find((c) => c.id === columnId);
  //     if (!column) return prev;

  //     column.tasks.push({
  //       id: generateId(),
  //       title: "New Card",
  //     });

  //     return next;
  //   });
  // };

  async function createTask(taskData: {
    title: string;
    description?: string;
    assignee?: string;
    dueDate?: string;
    priority: "low" | "medium" | "high";
  }) {
    const targetColumn = columns[0];
    if (!targetColumn) {
      throw new Error("No column available to add task");
    }

    await createRealTask(targetColumn.id, taskData);
  }

  async function handleCreateTask(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const taskData = {
      title: formData.get("title") as string,
      description: (formData.get("description") as string) || undefined,
      assignee: (formData.get("assignee") as string) || undefined,
      dueDate: (formData.get("dueDate") as string) || undefined,
      priority:
        (formData.get("priority") as "low" | "medium" | "high") || "medium",
    };

    if (taskData.title.trim()) {
      await createTask(taskData);

      const trigger = document.querySelector(
        '[data-state="open"',
      ) as HTMLElement;
      if (trigger) trigger.click();
    }
  }

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
          <Column
            key={column.id}
            column={column}
            // onAddCard={addCard}
            onCreateTask={handleCreateTask}
          />
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
          + Add another list
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
