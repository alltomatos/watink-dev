import React, { ReactNode } from "react";
import Markdown from "markdown-to-jsx";

// All HTML elements — only allowedElements pass through as-is; rest are stripped to their children
const elements: string[] = [
  "a","abbr","address","area","article","aside","audio","b","base","bdi","bdo","big",
  "blockquote","body","br","button","canvas","caption","cite","code","col","colgroup",
  "data","datalist","dd","del","details","dfn","dialog","div","dl","dt","em","embed",
  "fieldset","figcaption","figure","footer","form","h1","h2","h3","h4","h5","h6",
  "head","header","hgroup","hr","html","i","iframe","img","input","ins","kbd","label",
  "legend","li","link","main","map","mark","menu","meta","meter","nav","noscript",
  "object","ol","optgroup","option","output","p","picture","pre","progress","q","rp",
  "rt","ruby","s","samp","script","section","select","small","source","span","strong",
  "style","sub","summary","sup","table","tbody","td","template","textarea","tfoot",
  "th","thead","time","title","tr","track","u","ul","var","video","wbr",
];

const allowedElements = ["a", "b", "strong", "em", "u", "code", "del"];

const CustomLink: React.FC<React.AnchorHTMLAttributes<HTMLAnchorElement>> = ({
  children,
  ...props
}) => (
  <a {...props} target="_blank" rel="noopener noreferrer">
    {children}
  </a>
);

interface MarkdownWrapperProps {
  children?: string | null;
  mentionsMap?: Record<string, string>;
}

const MarkdownWrapper: React.FC<MarkdownWrapperProps> = ({
  children,
  mentionsMap,
}) => {
  let text = children ?? null;

  if (text?.includes("BEGIN:VCARD")) text = null;
  if (text?.includes("data:image/")) text = null;

  if (text) {
    text = text.replace(/\*(.*?)\*/g, "**$1**");
    text = text.replace(/~(.*?)~/g, "~~$1~~");
    text = text.replace(/@(\d+)/g, (match, number: string) => {
      if (mentionsMap?.[number]) return `@${mentionsMap[number]}`;
      return match;
    });
  }

  const options = React.useMemo(() => {
    const markdownOptions: Parameters<typeof Markdown>[0]["options"] & {
      overrides: Record<string, unknown>;
    } = {
      disableParsingRawHTML: true,
      forceInline: true,
      overrides: {
        a: { component: CustomLink },
      },
    };

    elements.forEach((el) => {
      if (!allowedElements.includes(el)) {
        (markdownOptions.overrides as Record<string, (p: { children?: ReactNode }) => ReactNode>)[el] =
          (p) => (p.children as ReactNode) ?? null;
      }
    });

    return markdownOptions;
  }, []);

  if (!text) return null;

  return <Markdown options={options}>{text}</Markdown>;
};

export default MarkdownWrapper;
