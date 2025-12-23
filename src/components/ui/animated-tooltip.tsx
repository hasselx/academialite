"use client";

import React, { useState } from "react";
import {
  motion,
  useTransform,
  AnimatePresence,
  useMotionValue,
  useSpring,
} from "framer-motion";
import { BadgeCheck } from "lucide-react";

export const AnimatedTooltip = ({
  items,
}: {
  items: {
    id: number;
    name: string;
    designation: string;
    image: string;
    verified?: boolean;
    link?: string;
  }[];
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const springConfig = { stiffness: 100, damping: 5 };
  const x = useMotionValue(0);
  const rotate = useSpring(
    useTransform(x, [-100, 100], [-45, 45]),
    springConfig
  );
  const translateX = useSpring(
    useTransform(x, [-100, 100], [-50, 50]),
    springConfig
  );
  
  const handleMouseMove = (event: React.MouseEvent<HTMLElement>) => {
    const halfWidth = event.currentTarget.offsetWidth / 2;
    x.set(event.nativeEvent.offsetX - halfWidth);
  };

  const handleClick = (link?: string) => {
    if (link) {
      window.open(link, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <>
      {items.map((item) => (
        <div
          className="relative group cursor-pointer"
          key={item.id}
          onMouseEnter={() => setHoveredIndex(item.id)}
          onMouseLeave={() => setHoveredIndex(null)}
          onClick={() => handleClick(item.link)}
        >
          <AnimatePresence mode="popLayout">
            {hoveredIndex === item.id && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.6 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  transition: {
                    type: "spring",
                    stiffness: 260,
                    damping: 10,
                  },
                }}
                exit={{ opacity: 0, y: 20, scale: 0.6 }}
                style={{
                  translateX: translateX,
                  rotate: rotate,
                  whiteSpace: "nowrap",
                }}
                className="absolute -top-20 left-1/2 -translate-x-1/2 flex flex-col items-center justify-center rounded-xl bg-card border border-border shadow-xl px-4 py-2 z-50"
              >
                <div className="font-bold text-foreground text-base flex items-center gap-1.5">
                  {item.name}
                  {item.verified && (
                    <BadgeCheck className="w-4 h-4 text-blue-500 fill-blue-500" />
                  )}
                </div>
                <div className="text-muted-foreground text-sm">
                  {item.designation}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="relative">
            <img
              onMouseMove={handleMouseMove}
              src={item.image}
              alt={item.name}
              className="object-cover !m-0 !p-0 object-center rounded-full h-16 w-16 border-2 border-border group-hover:scale-105 group-hover:z-30 transition-all duration-300 shadow-lg"
            />
            {item.verified && (
              <div className="absolute -bottom-1 -right-1 bg-card rounded-full p-0.5 border border-border">
                <BadgeCheck className="w-4 h-4 text-blue-500 fill-blue-500" />
              </div>
            )}
          </div>
        </div>
      ))}
    </>
  );
};
