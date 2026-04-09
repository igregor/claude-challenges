"use client";

import { Message } from "ai";
import { cn } from "@/lib/utils";
import { User, Bot, Loader2, FilePlus, FilePen, FilePlus2, Eye, Undo2, FileEdit, Trash2 } from "lucide-react";
import { MarkdownRenderer } from "./MarkdownRenderer";
import type { LucideIcon } from "lucide-react";

// Translates cryptic AI robot speak into human feelings @gregorek
function ToolInvocationCard({ tool }: { tool: { toolName: string; state: string; args: Record<string, string>; result?: unknown } }) {
  const done = tool.state === "result";
  const args = tool.args ?? {};
  const command: string = args.command ?? "";

  type ActionDef = { inProgress: string; done: string; Icon: LucideIcon };

  const actionMap: Record<string, Record<string, ActionDef>> = {
    str_replace_editor: {
      create:     { inProgress: "Creating",      done: "Created",      Icon: FilePlus   },
      str_replace: { inProgress: "Editing",      done: "Edited",       Icon: FilePen    },
      insert:     { inProgress: "Inserting into", done: "Inserted into", Icon: FilePlus2 },
      view:       { inProgress: "Reading",       done: "Read",         Icon: Eye        },
      undo_edit:  { inProgress: "Reverting",     done: "Reverted",     Icon: Undo2      },
    },
    file_manager: {
      rename: { inProgress: "Renaming", done: "Renamed", Icon: FileEdit },
      delete: { inProgress: "Deleting", done: "Deleted", Icon: Trash2   },
    },
  };

  const action = actionMap[tool.toolName]?.[command];
  const label = action ? (done ? action.done : action.inProgress) : tool.toolName;
  const Icon = action?.Icon;
  const path: string = args.path ?? "";
  const newPath: string = args.new_path ?? "";

  return (
    <div className="flex items-center gap-2 mt-2 px-3 py-2 bg-neutral-50 rounded-lg border border-neutral-200 text-xs w-fit">
      {done && Icon ? (
        <Icon className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
      ) : (
        <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500 flex-shrink-0" />
      )}
      <span className="text-neutral-500 font-medium">{label}</span>
      {command === "rename" && newPath ? (
        <>
          <span className="font-mono text-neutral-800">{path}</span>
          <span className="text-neutral-400">→</span>
          <span className="font-mono text-neutral-800">{newPath}</span>
        </>
      ) : path ? (
        <span className="font-mono text-neutral-800">{path}</span>
      ) : null}
    </div>
  );
}

interface MessageListProps {
  messages: Message[];
  isLoading?: boolean;
}

export function MessageList({ messages, isLoading }: MessageListProps) {
  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-4 text-center">
        <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-50 mb-4 shadow-sm">
          <Bot className="h-7 w-7 text-blue-600" />
        </div>
        <p className="text-neutral-900 font-semibold text-lg mb-2">Start a conversation to generate React components</p>
        <p className="text-neutral-500 text-sm max-w-sm">I can help you create buttons, forms, cards, and more</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto px-4 py-6">
      <div className="space-y-6 max-w-4xl mx-auto w-full">
        {messages.map((message) => (
          <div
            key={message.id || message.content}
            className={cn(
              "flex gap-4",
              message.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            {message.role === "assistant" && (
              <div className="flex-shrink-0">
                <div className="w-9 h-9 rounded-lg bg-white border border-neutral-200 shadow-sm flex items-center justify-center">
                  <Bot className="h-4.5 w-4.5 text-neutral-700" />
                </div>
              </div>
            )}
            
            <div className={cn(
              "flex flex-col gap-2 max-w-[85%]",
              message.role === "user" ? "items-end" : "items-start"
            )}>
              <div className={cn(
                "rounded-xl px-4 py-3",
                message.role === "user" 
                  ? "bg-blue-600 text-white shadow-sm" 
                  : "bg-white text-neutral-900 border border-neutral-200 shadow-sm"
              )}>
                <div className="text-sm">
                  {message.parts ? (
                    <>
                      {message.parts.map((part, partIndex) => {
                        switch (part.type) {
                          case "text":
                            return message.role === "user" ? (
                              <span key={partIndex} className="whitespace-pre-wrap">{part.text}</span>
                            ) : (
                              <MarkdownRenderer
                                key={partIndex}
                                content={part.text}
                                className="prose-sm"
                              />
                            );
                          case "reasoning":
                            return (
                              <div key={partIndex} className="mt-3 p-3 bg-white/50 rounded-md border border-neutral-200">
                                <span className="text-xs font-medium text-neutral-600 block mb-1">Reasoning</span>
                                <span className="text-sm text-neutral-700">{part.reasoning}</span>
                              </div>
                            );
                          case "tool-invocation":
                            return <ToolInvocationCard key={partIndex} tool={part.toolInvocation as Parameters<typeof ToolInvocationCard>[0]["tool"]} />;
                          case "source":
                            return (
                              <div key={partIndex} className="mt-2 text-xs text-neutral-500">
                                Source: {JSON.stringify(part.source)}
                              </div>
                            );
                          case "step-start":
                            return partIndex > 0 ? <hr key={partIndex} className="my-3 border-neutral-200" /> : null;
                          default:
                            return null;
                        }
                      })}
                      {isLoading &&
                        message.role === "assistant" &&
                        messages.indexOf(message) === messages.length - 1 && (
                          <div className="flex items-center gap-2 mt-3 text-neutral-500">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            <span className="text-sm">Generating...</span>
                          </div>
                        )}
                    </>
                  ) : message.content ? (
                    message.role === "user" ? (
                      <span className="whitespace-pre-wrap">{message.content}</span>
                    ) : (
                      <MarkdownRenderer content={message.content} className="prose-sm" />
                    )
                  ) : isLoading &&
                    message.role === "assistant" &&
                    messages.indexOf(message) === messages.length - 1 ? (
                    <div className="flex items-center gap-2 text-neutral-500">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span className="text-sm">Generating...</span>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
            
            {message.role === "user" && (
              <div className="flex-shrink-0">
                <div className="w-9 h-9 rounded-lg bg-blue-600 shadow-sm flex items-center justify-center">
                  <User className="h-4.5 w-4.5 text-white" />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}