/**
 * Drag and Drop Example using @dnd-kit
 *
 * @dnd-kit is a modern, lightweight, performant, and extensible drag & drop toolkit
 * for React. It's the recommended replacement for react-beautiful-dnd (which is no
 * longer maintained).
 *
 * Documentation: https://docs.dndkit.com/
 */

import React, { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

/**
 * Example: Sortable Item Component
 * This component can be dragged and dropped to reorder
 */
export function SortableItem({ id, children }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: 'grab',
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
}

/**
 * Example: Sortable List Component
 * A list where items can be reordered via drag and drop
 */
export function SortableList({ items, onReorder }) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);

      const newItems = arrayMove(items, oldIndex, newIndex);
      onReorder(newItems);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        {items.map((item) => (
          <SortableItem key={item.id} id={item.id}>
            {item.content}
          </SortableItem>
        ))}
      </SortableContext>
    </DndContext>
  );
}

/**
 * Example Usage:
 *
 * function MyComponent() {
 *   const [items, setItems] = useState([
 *     { id: '1', content: 'Item 1' },
 *     { id: '2', content: 'Item 2' },
 *     { id: '3', content: 'Item 3' },
 *   ]);
 *
 *   return (
 *     <SortableList
 *       items={items}
 *       onReorder={(newItems) => setItems(newItems)}
 *     />
 *   );
 * }
 */

/**
 * Example: Deal Pipeline Kanban Board
 * Drag deals between different stages
 */
export function DealPipelineExample() {
  const [deals, setDeals] = useState({
    prospecting: [
      { id: '1', name: 'Deal 1', value: 5000 },
      { id: '2', name: 'Deal 2', value: 10000 },
    ],
    qualification: [
      { id: '3', name: 'Deal 3', value: 15000 },
    ],
    proposal: [],
    negotiation: [
      { id: '4', name: 'Deal 4', value: 20000 },
    ],
  });

  const stages = ['prospecting', 'qualification', 'proposal', 'negotiation'];

  // This is a simplified example
  // For full Kanban board implementation, see @dnd-kit/sortable documentation
  return (
    <div style={{ display: 'flex', gap: '1rem' }}>
      {stages.map((stage) => (
        <div
          key={stage}
          style={{
            flex: 1,
            padding: '1rem',
            backgroundColor: '#f5f5f5',
            borderRadius: '8px',
          }}
        >
          <h3 style={{ textTransform: 'capitalize', marginBottom: '1rem' }}>
            {stage}
          </h3>
          <SortableList
            items={deals[stage]}
            onReorder={(newItems) =>
              setDeals({ ...deals, [stage]: newItems })
            }
          />
        </div>
      ))}
    </div>
  );
}

/**
 * Migration Notes from react-beautiful-dnd to @dnd-kit:
 *
 * 1. Smaller bundle size: @dnd-kit is ~30% smaller
 * 2. Better performance: Uses transform instead of position
 * 3. Accessibility: Built-in keyboard navigation
 * 4. Flexibility: More composable API
 * 5. TypeScript: Full TypeScript support
 *
 * Key Differences:
 * - DragDropContext → DndContext
 * - Droppable → SortableContext
 * - Draggable → useSortable hook
 * - No need for snapshot/provided pattern
 * - Uses CSS transforms for smooth animations
 */
