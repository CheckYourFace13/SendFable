"use client";

import { useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Heading,
  Type,
  Image as ImageIcon,
  MousePointerClick,
  Minus,
  Space,
  Columns2,
  Share2,
  Footprints,
  Monitor,
  Smartphone,
  Code2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type DesignBlock,
  type EmailDesign,
  compileEmailHtml,
  createEmptyDesign,
} from "@/lib/email-compiler";
import { MERGE_TAG_OPTIONS } from "@/lib/merge";
import { SIMPLE_BLOCK_TYPES } from "@/lib/simple-design";
import { cn, randomToken } from "@/lib/utils";
import { TiptapEditor } from "./tiptap-editor";

const PALETTE: Array<{ type: DesignBlock["type"]; label: string; icon: React.ReactNode }> = [
  { type: "heading", label: "Heading", icon: <Heading className="h-4 w-4" /> },
  { type: "text", label: "Text", icon: <Type className="h-4 w-4" /> },
  { type: "image", label: "Image", icon: <ImageIcon className="h-4 w-4" /> },
  { type: "button", label: "Button", icon: <MousePointerClick className="h-4 w-4" /> },
  { type: "divider", label: "Divider", icon: <Minus className="h-4 w-4" /> },
  { type: "spacer", label: "Spacer", icon: <Space className="h-4 w-4" /> },
  { type: "columns", label: "2 columns", icon: <Columns2 className="h-4 w-4" /> },
  { type: "social", label: "Social", icon: <Share2 className="h-4 w-4" /> },
  { type: "footer", label: "Footer", icon: <Footprints className="h-4 w-4" /> },
];

function defaultProps(type: DesignBlock["type"]): Record<string, unknown> {
  switch (type) {
    case "heading":
      return { text: "Heading", level: 1, align: "left", color: "#111827" };
    case "text":
      return { html: "<p>Write your message…</p>", align: "left" };
    case "image":
      return { src: "", alt: "", width: 520 };
    case "button":
      return {
        label: "Click here",
        href: "https://",
        backgroundColor: "#4F46E5",
        textColor: "#ffffff",
        align: "center",
      };
    case "divider":
      return { color: "#e5e7eb" };
    case "spacer":
      return { height: 24 };
    case "social":
      return {
        links: [
          { network: "Twitter", url: "https://twitter.com" },
          { network: "LinkedIn", url: "https://linkedin.com" },
        ],
      };
    case "footer":
      return { mailingAddress: "" };
    case "columns":
      return {};
    default:
      return {};
  }
}

function SortableBlock({
  block,
  selected,
  onSelect,
}: {
  block: DesignBlock;
  selected: boolean;
  onSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: block.id,
  });
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
      onClick={onSelect}
      className={cn(
        "cursor-grab rounded-lg border bg-white p-3 text-sm active:cursor-grabbing",
        selected ? "border-indigo-600 ring-2 ring-indigo-100" : "border-slate-200"
      )}
    >
      <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {block.type}
      </div>
      <BlockPreview block={block} />
    </div>
  );
}

function BlockPreview({ block }: { block: DesignBlock }) {
  switch (block.type) {
    case "heading":
      return <div className="font-semibold text-lg">{String(block.props.text)}</div>;
    case "text":
      return (
        <div
          className="prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: String(block.props.html || "") }}
        />
      );
    case "image":
      return block.props.src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={String(block.props.src)} alt="" className="max-h-32 rounded" />
      ) : (
        <div className="rounded bg-slate-100 py-8 text-center text-muted-foreground">Image</div>
      );
    case "button":
      return (
        <div className="text-center">
          <span className="inline-block rounded-lg bg-indigo-600 px-4 py-2 text-white">
            {String(block.props.label)}
          </span>
        </div>
      );
    case "divider":
      return <hr />;
    case "spacer":
      return <div style={{ height: Number(block.props.height || 24) }} />;
    case "social":
      return <div className="text-center text-indigo-600">Social links</div>;
    case "footer":
      return <div className="text-center text-xs text-muted-foreground">Footer · Unsubscribe</div>;
    case "columns":
      return <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground"><div className="rounded bg-slate-50 p-4">Col 1</div><div className="rounded bg-slate-50 p-4">Col 2</div></div>;
    default:
      return null;
  }
}

export function EmailBuilder({
  initialDesign,
  mailingAddress,
  showBadge,
  previewText,
  onChange,
  simpleMode = true,
  onSimpleModeChange,
  onRawHtmlModeChange,
}: {
  initialDesign?: EmailDesign | null;
  mailingAddress?: string | null;
  showBadge?: boolean;
  previewText?: string | null;
  onChange: (design: EmailDesign, compiledHtml: string) => void;
  simpleMode?: boolean;
  onSimpleModeChange?: (simple: boolean) => void;
  onRawHtmlModeChange?: (raw: boolean) => void;
}) {
  const [design, setDesign] = useState<EmailDesign>(initialDesign ?? createEmptyDesign());
  const [selectedId, setSelectedId] = useState<string | null>(design.blocks[0]?.id ?? null);
  const [preview, setPreview] = useState<"desktop" | "mobile">("desktop");
  const [rawMode, setRawMode] = useState(false);
  const [rawHtml, setRawHtml] = useState("");
  const palette = simpleMode
    ? PALETTE.filter((p) => SIMPLE_BLOCK_TYPES.has(p.type) || p.type === "image")
    : PALETTE;

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const selected = design.blocks.find((b) => b.id === selectedId) ?? null;

  function emit(next: EmailDesign) {
    setDesign(next);
    const html = compileEmailHtml(next, {
      mailingAddress,
      showSendfableBadge: showBadge,
      previewText,
    });
    onChange(next, html);
  }

  function addBlock(type: DesignBlock["type"]) {
    const block: DesignBlock = {
      id: randomToken(8),
      type,
      props: defaultProps(type),
      children:
        type === "columns"
          ? [
              { id: randomToken(6), type: "text", props: { html: "<p>Left</p>" } },
              { id: randomToken(6), type: "text", props: { html: "<p>Right</p>" } },
            ]
          : undefined,
    };
    const next = { ...design, blocks: [...design.blocks, block] };
    setSelectedId(block.id);
    emit(next);
  }

  function updateSelected(props: Record<string, unknown>) {
    if (!selected) return;
    const next = {
      ...design,
      blocks: design.blocks.map((b) =>
        b.id === selected.id ? { ...b, props: { ...b.props, ...props } } : b
      ),
    };
    emit(next);
  }

  function removeSelected() {
    if (!selected) return;
    const next = { ...design, blocks: design.blocks.filter((b) => b.id !== selected.id) };
    setSelectedId(next.blocks[0]?.id ?? null);
    emit(next);
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = design.blocks.findIndex((b) => b.id === active.id);
    const newIndex = design.blocks.findIndex((b) => b.id === over.id);
    emit({ ...design, blocks: arrayMove(design.blocks, oldIndex, newIndex) });
  }

  function insertMergeTag(key: string) {
    if (!selected || selected.type !== "text") return;
    const tag = `{{${key}|}}`;
    const html = String(selected.props.html || "") + ` ${tag}`;
    updateSelected({ html });
  }

  const compiled = rawMode
    ? rawHtml
    : compileEmailHtml(design, {
        mailingAddress,
        showSendfableBadge: showBadge,
        previewText,
      });

  return (
    <div className="flex h-[calc(100vh-12rem)] min-h-[560px] overflow-hidden rounded-xl border bg-white">
      {/* Palette */}
      <aside className="w-44 shrink-0 overflow-y-auto border-r p-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-xs font-semibold uppercase text-muted-foreground">Blocks</div>
        </div>
        <button
          type="button"
          className="mb-3 w-full rounded-md border px-2 py-1.5 text-left text-xs"
          onClick={() => onSimpleModeChange?.(!simpleMode)}
        >
          {simpleMode ? "More options…" : "Simple mode"}
        </button>
        <div className="space-y-1">
          {palette.map((item) => (
            <button
              key={item.type}
              type="button"
              onClick={() => addBlock(item.type)}
              className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-slate-50"
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
        <div className="mt-4 border-t pt-3">
          <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Merge tags</div>
          {MERGE_TAG_OPTIONS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => insertMergeTag(t.key)}
              className="block w-full rounded px-2 py-1 text-left text-xs text-indigo-600 hover:bg-indigo-50"
            >
              {`{{${t.key}}}`}
            </button>
          ))}
        </div>
      </aside>

      {/* Canvas */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between border-b px-4 py-2">
          <div className="flex gap-1">
            <Button
              type="button"
              size="sm"
              variant={preview === "desktop" ? "default" : "ghost"}
              onClick={() => setPreview("desktop")}
            >
              <Monitor className="mr-1 h-4 w-4" /> Desktop
            </Button>
            <Button
              type="button"
              size="sm"
              variant={preview === "mobile" ? "default" : "ghost"}
              onClick={() => setPreview("mobile")}
            >
              <Smartphone className="mr-1 h-4 w-4" /> Mobile
            </Button>
          </div>
          {!simpleMode && (
            <Button
              type="button"
              size="sm"
              variant={rawMode ? "default" : "outline"}
              onClick={() => {
                if (!rawMode) setRawHtml(compiled);
                const next = !rawMode;
                setRawMode(next);
                onRawHtmlModeChange?.(next);
              }}
            >
              <Code2 className="mr-1 h-4 w-4" /> Raw HTML
            </Button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-100 p-6">
          {rawMode ? (
            <Textarea
              className="h-full min-h-[400px] font-mono text-xs"
              value={rawHtml}
              onChange={(e) => {
                setRawHtml(e.target.value);
                onChange(design, e.target.value);
              }}
            />
          ) : (
            <div
              className={cn(
                "mx-auto space-y-2 rounded-lg bg-slate-50 p-4 shadow-sm",
                preview === "mobile" ? "max-w-[375px]" : "max-w-[640px]"
              )}
            >
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                <SortableContext
                  items={design.blocks.map((b) => b.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {design.blocks.map((block) => (
                    <SortableBlock
                      key={block.id}
                      block={block}
                      selected={block.id === selectedId}
                      onSelect={() => setSelectedId(block.id)}
                    />
                  ))}
                </SortableContext>
              </DndContext>
              {!design.blocks.length && (
                <div className="py-16 text-center text-sm text-muted-foreground">
                  Add blocks from the left palette
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Properties */}
      <aside className="w-72 shrink-0 overflow-y-auto border-l p-4">
        <div className="mb-3 text-xs font-semibold uppercase text-muted-foreground">Properties</div>
        {!selected || rawMode ? (
          <p className="text-sm text-muted-foreground">Select a block to edit</p>
        ) : (
          <div className="space-y-3">
            {selected.type === "heading" && (
              <>
                <div>
                  <Label>Text</Label>
                  <Input
                    value={String(selected.props.text || "")}
                    onChange={(e) => updateSelected({ text: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Level</Label>
                  <Select
                    value={String(selected.props.level || 1)}
                    onValueChange={(v) => updateSelected({ level: Number(v) })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">H1</SelectItem>
                      <SelectItem value="2">H2</SelectItem>
                      <SelectItem value="3">H3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            {selected.type === "text" && (
              <div>
                <Label>Content</Label>
                <TiptapEditor
                  content={String(selected.props.html || "")}
                  onChange={(html) => updateSelected({ html })}
                />
              </div>
            )}
            {selected.type === "image" && (
              <>
                <div>
                  <Label>Image URL</Label>
                  <Input
                    value={String(selected.props.src || "")}
                    onChange={(e) => updateSelected({ src: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Upload</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const fd = new FormData();
                      fd.append("file", file);
                      const res = await fetch("/api/uploads", { method: "POST", body: fd });
                      const data = await res.json();
                      if (res.ok) updateSelected({ src: data.url });
                    }}
                  />
                </div>
                <div>
                  <Label>Alt text</Label>
                  <Input
                    value={String(selected.props.alt || "")}
                    onChange={(e) => updateSelected({ alt: e.target.value })}
                  />
                </div>
              </>
            )}
            {selected.type === "button" && (
              <>
                <div>
                  <Label>Label</Label>
                  <Input
                    value={String(selected.props.label || "")}
                    onChange={(e) => updateSelected({ label: e.target.value })}
                  />
                </div>
                <div>
                  <Label>URL</Label>
                  <Input
                    value={String(selected.props.href || "")}
                    onChange={(e) => updateSelected({ href: e.target.value })}
                  />
                </div>
              </>
            )}
            {selected.type === "spacer" && (
              <div>
                <Label>Height (px)</Label>
                <Input
                  type="number"
                  value={Number(selected.props.height || 24)}
                  onChange={(e) => updateSelected({ height: Number(e.target.value) })}
                />
              </div>
            )}
            <Button type="button" variant="destructive" size="sm" onClick={removeSelected}>
              Remove block
            </Button>
          </div>
        )}
      </aside>
    </div>
  );
}
