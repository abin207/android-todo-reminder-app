"use client";

import type { LocalTask } from "@/types/task";
import { TaskCard, type TaskCardLayout } from "./TaskCard";

export interface TaskSection {
  key: string;
  heading: string;
  subheading?: string;
  tasks: LocalTask[];
}

interface Props {
  sections: TaskSection[];
  layout?: TaskCardLayout;
  showDate?: boolean;
  onToggle: (id: string) => void;
  onOpen: (task: LocalTask) => void;
}

export function TaskList({
  sections,
  layout = "upcoming",
  showDate,
  onToggle,
  onOpen,
}: Props) {
  return (
    <div className="space-y-6">
      {sections
        .filter((section) => section.tasks.length > 0)
        .map((section) => (
          <section key={section.key}>
            {section.heading ? (
              <div className="mb-2 px-0.5">
                <h2 className="text-[17px] font-bold text-[#1B2340] dark:text-slate-50">
                  {section.heading}
                </h2>
                {section.subheading ? (
                  <p className="text-[13px] text-[#8B93A7]">{section.subheading}</p>
                ) : null}
              </div>
            ) : null}
            <ul className={layout === "timeline" ? "" : "space-y-0"}>
              {section.tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  layout={layout}
                  showDate={showDate}
                  onToggle={onToggle}
                  onOpen={onOpen}
                />
              ))}
            </ul>
          </section>
        ))}
    </div>
  );
}
