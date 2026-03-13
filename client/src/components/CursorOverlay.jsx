import React, { useEffect, useState, useRef } from "react";
import { supabase } from "../lib/supabase";

export default function CursorOverlay({
  tripId,
  currentUserId,
  currentUserName,
}) {
  const [others, setOthers] = useState({});
  const channelRef = useRef(null);

  useEffect(() => {
    if (!tripId || !currentUserId) return;

    // Create a Supabase channel
    const channel = supabase.channel(`trip-${tripId}`, {
      config: { presence: { key: currentUserId } },
    });
    channelRef.current = channel;

    // Listen for presence updates
    channel.on("presence", { event: "sync" }, () => {
      const presenceState = channel.presenceState();
      const updatedOthers = {};
      for (const [key, stateArray] of Object.entries(presenceState)) {
        if (key !== currentUserId && stateArray.length > 0) {
          updatedOthers[key] = {
            cursor: stateArray[0].cursor,
            username: stateArray[0].username || "User",
          };
        }
      }
      setOthers(updatedOthers);
    });

    // Subscribe to the channel
    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({ cursor: null, username: currentUserName });
      }
    });

    let lastUpdate = 0;
    const throttleDelay = 30; // 30ms

    // Track cursor movement
    const handlePointerMove = (e) => {
      const now = Date.now();
      if (now - lastUpdate >= throttleDelay) {
        lastUpdate = now;
        if (channelRef.current) {
          channelRef.current.track({
            cursor: { x: Math.round(e.clientX), y: Math.round(e.clientY) },
            username: currentUserName,
          });
        }
      }
    };

    const handlePointerLeave = () => {
      if (channelRef.current) {
        channelRef.current.track({ cursor: null, username: currentUserName });
      }
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerleave", handlePointerLeave);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerleave", handlePointerLeave);
      channel.unsubscribe();
    };
  }, [tripId, currentUserId, currentUserName]);

  const COLORS = [
    "#ef4444",
    "#eab308",
    "#10b981",
    "#3b82f6",
    "#8b5cf6",
    "#d946ef",
    "#f43f5e",
  ];

  // Helper to string to number for consistent color
  const getColor = (id) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++)
      hash = id.charCodeAt(i) + ((hash << 5) - hash);
    return COLORS[Math.abs(hash) % COLORS.length];
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        pointerEvents: "none",
        zIndex: 9999,
      }}
    >
      {Object.entries(others).map(([id, state]) => {
        if (!state || !state.cursor) return null;
        const color = getColor(id);
        return (
          <div
            key={id}
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              transform: `translate(${state.cursor.x}px, ${state.cursor.y}px)`,
              transition: "transform 0.1s linear",
            }}
          >
            <svg
              width="24"
              height="36"
              viewBox="0 0 24 36"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z"
                fill={color}
              />
            </svg>
            <div
              style={{
                position: "absolute",
                left: "20px",
                top: "20px",
                backgroundColor: color,
                color: "white",
                padding: "4px 8px",
                borderRadius: "12px",
                borderTopLeftRadius: "0",
                fontSize: "12px",
                fontWeight: "bold",
                boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                whiteSpace: "nowrap",
                fontFamily: "sans-serif",
              }}
            >
              {state.username}
            </div>
          </div>
        );
      })}
    </div>
  );
}
