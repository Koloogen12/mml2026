import { Node, mergeAttributes } from "@tiptap/core";

// Коллаут — блок «важно / совет / осторожно». У донора коллаутов нет вообще
// (там за них выдан обычный blockquote), поэтому узел свой.
// В HTML уходит как <div data-callout="info|tip|warn">…</div> — ровно то,
// что пропускает санитайзер на бэке (internal/blog/blog.go).

export type CalloutKind = "info" | "tip" | "warn";

export const CALLOUTS: Array<{ kind: CalloutKind; label: string; icon: string }> = [
  { kind: "info", label: "Важно", icon: "i" },
  { kind: "tip", label: "Совет", icon: "★" },
  { kind: "warn", label: "Осторожно", icon: "!" },
];

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    callout: {
      setCallout: (kind: CalloutKind) => ReturnType;
      toggleCallout: (kind: CalloutKind) => ReturnType;
    };
  }
}

export const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      kind: {
        default: "info" as CalloutKind,
        parseHTML: (el) => el.getAttribute("data-callout") || "info",
        renderHTML: (attrs) => ({ "data-callout": attrs.kind }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-callout]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes), 0];
  },

  addCommands() {
    return {
      setCallout:
        (kind) =>
        ({ commands }) =>
          commands.wrapIn(this.name, { kind }),
      toggleCallout:
        (kind) =>
        ({ commands }) =>
          commands.toggleWrap(this.name, { kind }),
    };
  },
});
