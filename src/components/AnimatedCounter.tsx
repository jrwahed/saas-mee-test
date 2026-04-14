import { useEffect, useState, useRef } from "react";

interface AnimatedCounterProps {
  value: string;
  className?: string;
  duration?: number;
}

export function AnimatedCounter({ value, className = "", duration = 1200 }: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const prevRef = useRef(value);
  const frameRef = useRef<number>();

  useEffect(() => {
    // Extract numeric part
    const numMatch = value.match(/([\d,]+)/);
    const prevMatch = prevRef.current.match(/([\d,]+)/);
    
    if (!numMatch) {
      setDisplayValue(value);
      prevRef.current = value;
      return;
    }

    const targetNum = parseInt(numMatch[1].replace(/,/g, ""));
    const startNum = prevMatch ? parseInt(prevMatch[1].replace(/,/g, "")) : 0;
    
    if (isNaN(targetNum) || targetNum === startNum) {
      setDisplayValue(value);
      prevRef.current = value;
      return;
    }

    const prefix = value.substring(0, value.indexOf(numMatch[1]));
    const suffix = value.substring(value.indexOf(numMatch[1]) + numMatch[1].length);
    
    const startTime = performance.now();
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startNum + (targetNum - startNum) * eased);
      
      setDisplayValue(`${prefix}${current.toLocaleString()}${suffix}`);
      
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(value);
      }
    };
    
    frameRef.current = requestAnimationFrame(animate);
    prevRef.current = value;

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [value, duration]);

  return <span className={className}>{displayValue}</span>;
}
