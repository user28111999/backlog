"use client";
import { useState } from "react";
import { useServerInsertedHTML } from "next/navigation";
import {
  ServerStyleSheet,
  StyleSheetManager,
  ThemeProvider,
} from "styled-components";
import { theme } from "@/lib/theme";
export default function Registry({ children }: { children: React.ReactNode }) {
  const [sheet] = useState(() => new ServerStyleSheet());
  useServerInsertedHTML(() => {
    const styles = sheet.getStyleElement();
    sheet.instance.clearTag();
    return <>{styles}</>;
  });
  const content = <ThemeProvider theme={theme}>{children}</ThemeProvider>;
  return typeof window !== "undefined" ? (
    content
  ) : (
    <StyleSheetManager sheet={sheet.instance}>{content}</StyleSheetManager>
  );
}
