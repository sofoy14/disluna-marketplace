"use client"

import { useState } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { shaders } from "@/lib/shaders";
import { ShaderPreviewButton } from "@/components/shader-preview-button";

interface ShaderSelectorProps {
  selectedShader: number;
  onSelectShader: (id: number) => void;
}

export const ShaderSelector = ({ selectedShader, onSelectShader }: ShaderSelectorProps) => {
  const [hoveredShader, setHoveredShader] = useState<number | null>(null);

  return (
    <TooltipProvider>
      <div className="flex flex-wrap gap-4">
        {shaders.map((shader) => (
          <Tooltip key={shader.id}>
            <TooltipTrigger asChild>
              <div className={`transition-opacity ${hoveredShader && hoveredShader !== shader.id ? 'opacity-60' : 'opacity-100'}`}>
                <ShaderPreviewButton
                  shaderId={shader.id}
                  isSelected={selectedShader === shader.id}
                  onSelect={() => onSelectShader(shader.id)}
                  onMouseEnter={() => setHoveredShader(shader.id)}
                  onMouseLeave={() => setHoveredShader(null)}
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{shader.name}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
};


