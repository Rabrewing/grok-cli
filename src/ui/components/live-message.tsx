import React, { useEffect, useRef, useState } from "react";
import { Box, Text } from "ink";

export function LiveMessage({
  role,
  content,
  isFinal,
}: {
  role: "user" | "assistant" | string;
  content: string;
  isFinal?: boolean;
}) {
  const [display, setDisplay] = useState(content);
  const bufferRef = useRef(content);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    bufferRef.current = content;
  }, [content]);

  useEffect(() => {
    const interval = 30; // Fixed 30ms for speed (faster than 33ms at 30 FPS)
    if (!isFinal) {
      timerRef.current = setInterval(() => {
        // Batch drops: only update if buffer has new content (avoids redundant renders)
        if (display !== bufferRef.current) {
          setDisplay(bufferRef.current);
        }
      }, interval);
    } else {
      setDisplay(bufferRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFinal]); // Removed fps dep for fixed speed

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text color="gray">{role === "user" ? "You" : "Grok"}</Text>
      <Text>{display}</Text>
      {!isFinal ? <Text dimColor>…streaming</Text> : null}
    </Box>
  );
}