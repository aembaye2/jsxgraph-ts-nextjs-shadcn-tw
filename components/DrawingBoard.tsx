"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Slash, Square, Circle, Undo, Redo, Trash2, Dot, Triangle, Download, MoveUpRight, MoveDiagonal } from "lucide-react";
import html2canvas from "html2canvas";

type DrawingMode = "point" | "segment" | "arrow" | "doubleArrow" | "triangle" | "rectangle" | "circle" | null;

interface Point {
  x: number;
  y: number;
}

export default function DrawingBoard() {
  const boardRef = useRef<HTMLDivElement>(null);
  const [board, setBoard] = useState<any>(null);
  const [mode, setMode] = useState<DrawingMode>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [currentShape, setCurrentShape] = useState<any>(null);
  
  const undoStackRef = useRef<any[][]>([]);
  const redoStackRef = useRef<any[][]>([]);
  const [version, setVersion] = useState(0);
  const JSXGraphRef = useRef<any>(null);
  const boundingBox: [number, number, number, number] = [-1, 11, 11, -1];

  useEffect(() => {
    if (typeof window !== "undefined" && boardRef.current) {
      const loadJSXGraph = async () => {
        const JSXGraphModule = await import("jsxgraph");
        const JSXGraph = (JSXGraphModule as any).JSXGraph || JSXGraphModule;
        JSXGraphRef.current = JSXGraph;
        
        // Make JXG globally available
        if (!window.hasOwnProperty('JXG')) {
          (window as any).JXG = JSXGraph;
        }
        
        // Add JSXGraph CSS
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "https://cdn.jsdelivr.net/npm/jsxgraph/distrib/jsxgraph.css";
        document.head.appendChild(link);

        const newBoard = JSXGraph.initBoard("jxgbox", {
          boundingbox: boundingBox,
          axis: true,
          showCopyright: false,
          showNavigation: true,
          pan: {
            enabled: false,
          },
          zoom: {
            enabled: false,
          },
          defaultAxes: {
            x: {
              ticks: {
                label: {
                  fontsize: 16,
                },
              },
              name: 'x',
              withLabel: true,
              label: {
                fontsize: 18,
              },
            },
            y: {
              ticks: {
                label: {
                  fontsize: 16,
                },
              },
              name: 'y',
              withLabel: true,
              label: {
                fontsize: 18,
              },
            },
          },
        });

        setBoard(newBoard);
      };

      loadJSXGraph();
    }
  }, []);

  const getMouseCoords = (e: MouseEvent) => {
    if (!board) return null;
    const cPos = board.getCoordsTopLeftCorner();
    const absPos = {
      x: e.clientX - cPos[0],
      y: e.clientY - cPos[1],
    };
    return new (window as any).JXG.Coords(
      (window as any).JXG.COORDS_BY_SCREEN,
      [absPos.x, absPos.y],
      board
    );
  };

  useEffect(() => {
    if (!board || !mode) return;

    const handleMouseDown = (e: MouseEvent) => {
      const coords = getMouseCoords(e);
      if (!coords) return;

      setIsDrawing(true);
      setStartPoint({
        x: coords.usrCoords[1],
        y: coords.usrCoords[2],
      });

      // Create initial shape
      if (mode === "point") {
        const point = board.create("point", [coords.usrCoords[1], coords.usrCoords[2]], {
          size: 4,
          face: 'circle',
          fillColor: "#3b82f6",
          strokeColor: "#3b82f6",
          fixed: true,
        });
        setCurrentShape(point);
      } else if (mode === "triangle") {
        const p1 = board.create("point", [coords.usrCoords[1], coords.usrCoords[2]], {
          visible: false,
          fixed: true,
        });
        const p2 = board.create("point", [coords.usrCoords[1], coords.usrCoords[2]], {
          visible: false,
          fixed: true,
        });
        const p3 = board.create("point", [coords.usrCoords[1], coords.usrCoords[2]], {
          visible: false,
          fixed: true,
        });
        
        const triangle = board.create("polygon", [p1, p2, p3], {
          fillColor: "#fbbf24",
          fillOpacity: 0.2,
          borders: {
            strokeColor: "#f59e0b",
            strokeWidth: 2,
          },
          fixed: true,
        });
        
        setCurrentShape({ triangle, points: [p1, p2, p3], currentPointIndex: 1 });
      } else if (mode === "segment") {
        const p1 = board.create("point", [coords.usrCoords[1], coords.usrCoords[2]], {
          visible: false,
          fixed: true,
        });
        const p2 = board.create("point", [coords.usrCoords[1], coords.usrCoords[2]], {
          visible: false,
          fixed: true,
        });
        const segment = board.create("segment", [p1, p2], {
          strokeColor: "#3b82f6",
          strokeWidth: 2,
          fixed: true,
        });
        setCurrentShape({ segment, p1, p2 });
      } else if (mode === "arrow") {
        const p1 = board.create("point", [coords.usrCoords[1], coords.usrCoords[2]], {
          visible: false,
          fixed: true,
        });
        const p2 = board.create("point", [coords.usrCoords[1], coords.usrCoords[2]], {
          visible: false,
          fixed: true,
        });
        // single-direction arrow
        const arrow = board.create("arrow", [p1, p2], {
          strokeColor: "#3b82f6",
          strokeWidth: 2,
          fixed: true,
        });
        setCurrentShape({ arrow, p1, p2 });
      } else if (mode === "doubleArrow") {
        const p1 = board.create("point", [coords.usrCoords[1], coords.usrCoords[2]], {
          visible: false,
          fixed: true,
        });
        const p2 = board.create("point", [coords.usrCoords[1], coords.usrCoords[2]], {
          visible: false,
          fixed: true,
        });
        // create two arrows in opposite directions to show double-headed arrow
        const double1 = board.create("arrow", [p1, p2], {
          strokeColor: "#3b82f6",
          strokeWidth: 2,
          fixed: true,
        });
        const double2 = board.create("arrow", [p2, p1], {
          strokeColor: "#3b82f6",
          strokeWidth: 2,
          fixed: true,
        });
        setCurrentShape({ double1, double2, p1, p2 });
      } else if (mode === "rectangle") {
        const p1 = board.create("point", [coords.usrCoords[1], coords.usrCoords[2]], {
          visible: false,
          fixed: true,
        });
        const p2 = board.create("point", [coords.usrCoords[1], coords.usrCoords[2]], {
          visible: false,
          fixed: true,
        });
        const p3 = board.create("point", [coords.usrCoords[1], coords.usrCoords[2]], {
          visible: false,
          fixed: true,
        });
        const p4 = board.create("point", [coords.usrCoords[1], coords.usrCoords[2]], {
          visible: false,
          fixed: true,
        });
        
        const polygon = board.create("polygon", [p1, p2, p3, p4], {
          fillColor: "#3b82f6",
          fillOpacity: 0.3,
          strokeColor: "#3b82f6",
          strokeWidth: 2,
          fixed: true,
        });
        
        setCurrentShape({ polygon, points: [p1, p2, p3, p4] });
      } else if (mode === "circle") {
        const center = board.create("point", [coords.usrCoords[1], coords.usrCoords[2]], {
          visible: false,
          fixed: true,
        });
        const radiusPoint = board.create("point", [coords.usrCoords[1], coords.usrCoords[2]], {
          visible: false,
          fixed: true,
        });
        const circle = board.create("circle", [center, radiusPoint], {
          fillColor: "#3b82f6",
          fillOpacity: 0.3,
          strokeColor: "#3b82f6",
          strokeWidth: 2,
          fixed: true,
        });
        setCurrentShape({ circle, center, radiusPoint });
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDrawing || !currentShape || !startPoint) return;

      const coords = getMouseCoords(e);
      if (!coords) return;

      const currentX = coords.usrCoords[1];
      const currentY = coords.usrCoords[2];

      board.suspendUpdate();

      if (mode === "triangle") {
        const { points, currentPointIndex } = currentShape;
        if (currentPointIndex === 1) {
          // Setting second point
          points[1].setPosition((window as any).JXG.COORDS_BY_USER, [
            currentX,
            currentY,
          ]);
        } else if (currentPointIndex === 2) {
          // Setting third point
          points[2].setPosition((window as any).JXG.COORDS_BY_USER, [
            currentX,
            currentY,
          ]);
        }
      } else if (mode === "segment") {
        currentShape.p1.setPosition((window as any).JXG.COORDS_BY_USER, [
          startPoint.x,
          startPoint.y,
        ]);
        currentShape.p2.setPosition((window as any).JXG.COORDS_BY_USER, [
          currentX,
          currentY,
        ]);
      } else if (mode === "arrow") {
        currentShape.p1.setPosition((window as any).JXG.COORDS_BY_USER, [
          startPoint.x,
          startPoint.y,
        ]);
        currentShape.p2.setPosition((window as any).JXG.COORDS_BY_USER, [
          currentX,
          currentY,
        ]);
      } else if (mode === "doubleArrow") {
        currentShape.p1.setPosition((window as any).JXG.COORDS_BY_USER, [
          startPoint.x,
          startPoint.y,
        ]);
        currentShape.p2.setPosition((window as any).JXG.COORDS_BY_USER, [
          currentX,
          currentY,
        ]);
        // both arrows reference same points (reverse order for the second arrow)
        currentShape.double1.update && currentShape.double1.update();
        currentShape.double2.update && currentShape.double2.update();
      } else if (mode === "rectangle") {
        const { points } = currentShape;
        points[0].setPosition((window as any).JXG.COORDS_BY_USER, [
          startPoint.x,
          startPoint.y,
        ]);
        points[1].setPosition((window as any).JXG.COORDS_BY_USER, [
          currentX,
          startPoint.y,
        ]);
        points[2].setPosition((window as any).JXG.COORDS_BY_USER, [
          currentX,
          currentY,
        ]);
        points[3].setPosition((window as any).JXG.COORDS_BY_USER, [
          startPoint.x,
          currentY,
        ]);
      } else if (mode === "circle") {
        currentShape.radiusPoint.setPosition((window as any).JXG.COORDS_BY_USER, [
          currentX,
          currentY,
        ]);
      }

      board.unsuspendUpdate();
    };

    const handleMouseUp = (e: MouseEvent) => {
      const coords = getMouseCoords(e);
      if (!coords) return;

      if (!isDrawing || !currentShape) return;

      if (mode === "triangle") {
        const { points, currentPointIndex } = currentShape;

        if (currentPointIndex < 3) {
          // advance to next point
          setCurrentShape({ ...currentShape, currentPointIndex: currentPointIndex + 1 });
          setStartPoint({ x: coords.usrCoords[1], y: coords.usrCoords[2] });
          return;
        }

        // Triangle complete - push to undo stack
        const shapeObjects: any[] = [currentShape.triangle, ...currentShape.points];
        undoStackRef.current.push(shapeObjects);
        redoStackRef.current = [];
        setVersion((v) => v + 1);

        setIsDrawing(false);
        setCurrentShape(null);
        setStartPoint(null);
        return;
      }

      // Handle other shapes (point, segment, rectangle, circle)
      const shapeObjects: any[] = [];

      if (mode === "point") {
        shapeObjects.push(currentShape);
      } else if (mode === "segment") {
        shapeObjects.push(currentShape.segment, currentShape.p1, currentShape.p2);
      } else if (mode === "arrow") {
        shapeObjects.push(currentShape.arrow, currentShape.p1, currentShape.p2);
      } else if (mode === "doubleArrow") {
        shapeObjects.push(currentShape.double1, currentShape.double2, currentShape.p1, currentShape.p2);
      } else if (mode === "rectangle") {
        shapeObjects.push(currentShape.polygon, ...currentShape.points);
      } else if (mode === "circle") {
        shapeObjects.push(currentShape.circle, currentShape.center, currentShape.radiusPoint);
      }

      if (shapeObjects.length > 0) {
        undoStackRef.current.push(shapeObjects);
        redoStackRef.current = [];
        setVersion((v) => v + 1);
      }

      setIsDrawing(false);
      setCurrentShape(null);
      setStartPoint(null);
    };

    const boardElement = boardRef.current;
    if (boardElement) {
      boardElement.addEventListener("mousedown", handleMouseDown);
      boardElement.addEventListener("mousemove", handleMouseMove);
      boardElement.addEventListener("mouseup", handleMouseUp);
      boardElement.addEventListener("mouseleave", handleMouseUp);

      return () => {
        boardElement.removeEventListener("mousedown", handleMouseDown);
        boardElement.removeEventListener("mousemove", handleMouseMove);
        boardElement.removeEventListener("mouseup", handleMouseUp);
        boardElement.removeEventListener("mouseleave", handleMouseUp);
      };
    }
  }, [board, mode, isDrawing, currentShape, startPoint]);

  const clearBoard = () => {
    // Show confirmation dialog before clearing
    if (
      !window.confirm(
        "Are you sure you want to clear the board? This will delete all drawings and cannot be undone."
      )
    ) {
      return;
    }

    if (board && JSXGraphRef.current) {
      // Free the current board
      JSXGraphRef.current.freeBoard(board);
      
      // Reinitialize the board
      const newBoard = JSXGraphRef.current.initBoard("jxgbox", {
        boundingbox: boundingBox,
        axis: true,
        showCopyright: false,
        showNavigation: true,
        keepaspectratio: true,
        pan: {
          enabled: false,
        },
        zoom: {
          enabled: false,
        },
        defaultAxes: {
          x: {
            ticks: {
              label: {
                fontsize: 16,
              },
            },
            name: 'x',
            withLabel: true,
            label: {
              fontsize: 18,
            },
          },
          y: {
            ticks: {
              label: {
                fontsize: 16,
              },
            },
            name: 'y',
            withLabel: true,
            label: {
              fontsize: 18,
            },
          },
        },
      });
      setBoard(newBoard);
      undoStackRef.current = [];
      redoStackRef.current = [];
      setVersion((v) => v + 1);
    }
  };

  const undo = () => {
    const last = undoStackRef.current.pop();
    if (!last) return;
    
    // Hide all objects in the action
    last.forEach((obj) => {
      try {
        if (obj && typeof obj.setAttribute === "function") {
          obj.setAttribute({ visible: false });
        } else if (
          obj &&
          typeof obj.el === "object" &&
          typeof obj.el.setAttribute === "function"
        ) {
          obj.el.setAttribute({ visible: false });
        }
      } catch (e) {
        // Fallback: try remove
        try {
          if (obj && typeof obj.remove === "function") obj.remove();
        } catch {}
      }
    });
    
    redoStackRef.current.push(last);
    setVersion((v) => v + 1);
  };

  const redo = () => {
    const action = redoStackRef.current.pop();
    if (!action) return;
    
    action.forEach((obj) => {
      try {
        if (obj && typeof obj.setAttribute === "function") {
          obj.setAttribute({ visible: true });
        } else if (
          obj &&
          typeof obj.el === "object" &&
          typeof obj.el.setAttribute === "function"
        ) {
          obj.el.setAttribute({ visible: true });
        }
      } catch (e) {
        // Cannot recreate removed objects; ignore
      }
    });
    
    undoStackRef.current.push(action);
    setVersion((v) => v + 1);
  };

  //// Export the JSXGraph drawing to PNG using html2canvas
    const downloadPNG = async () => {
  if (!board) return;

  try {
    const svgElement = board.containerObj.querySelector('svg');
    if (!svgElement) throw new Error('SVG element not found');
    
    // Clone the SVG to avoid modifying the original
    const svgClone = svgElement.cloneNode(true) as SVGElement;
    
    // Get SVG dimensions
    const bbox = svgElement.getBoundingClientRect();
    const width = bbox.width;
    const height = bbox.height;
    
    // Set explicit dimensions on the clone
    svgClone.setAttribute('width', width.toString());
    svgClone.setAttribute('height', height.toString());
    
    const svgString = new XMLSerializer().serializeToString(svgClone);
    const svgBase64 = btoa(unescape(encodeURIComponent(svgString)));
    const dataUrl = `data:image/svg+xml;base64,${svgBase64}`;
    
    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = width * 2; // 2x for better quality
    canvas.height = height * 2;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');
    
    // Scale for better quality
    ctx.scale(2, 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, width, height);
      const png = canvas.toDataURL('image/png');
      
      const a = document.createElement('a');
      a.href = png;
      a.download = 'drawing.png';
      document.body.appendChild(a);
      a.click();
      
      setTimeout(() => {
        a.remove();
      }, 100);
    };
    
    img.onerror = () => {
      throw new Error('Failed to load SVG image');
    };
    
    img.src = dataUrl;
  } catch (err) {
    console.error(err);
    alert('Failed to export drawing as PNG');
  }
};

  return (
    <div className="flex flex-col items-center gap-4 p-8">
      <div className="flex items-center gap-1 flex-nowrap">
        <Button
          onClick={() => setMode("point")}
          variant={mode === "point" ? "default" : "outline"}
          title="Draw Point"
        >
          <Dot className="h-4 w-4" />
        </Button>
        <Button
          onClick={() => setMode("segment")}
          variant={mode === "segment" ? "default" : "outline"}
          title="Draw Segment"
        >
          <Slash className="h-4 w-4" />
        </Button>

        <Button
          onClick={() => setMode("arrow")}
          variant={mode === "arrow" ? "default" : "outline"}
          title="Draw Arrow"
        >
          <MoveUpRight className="h-4 w-4" />
        </Button>
        <Button
          onClick={() => setMode("doubleArrow")}
          variant={mode === "doubleArrow" ? "default" : "outline"}
          title="Draw Double Arrow"
        >
          <MoveDiagonal className="h-4 w-4" />
        </Button>
        <Button
          onClick={() => setMode("triangle")}
          variant={mode === "triangle" ? "default" : "outline"}
          title="Draw Triangle"
        >
          <Triangle className="h-4 w-4" />
        </Button>
        
        <Button
          onClick={() => setMode("rectangle")}
          variant={mode === "rectangle" ? "default" : "outline"}
          title="Draw Rectangle"
        >
          <Square className="h-4 w-4" />
        </Button>
        <Button
          onClick={() => setMode("circle")}
          variant={mode === "circle" ? "default" : "outline"}
          title="Draw Circle"
        >
          <Circle className="h-4 w-4" />
        </Button>        
        <Button 
          onClick={undo} 
          variant="outline"
          disabled={undoStackRef.current.length === 0}
          title="Undo"
        >
          <Undo className="h-4 w-4" />
        </Button>
        <Button 
          onClick={redo} 
          variant="outline"
          disabled={redoStackRef.current.length === 0}
          title="Redo"
        >
          <Redo className="h-4 w-4" />
        </Button>
        <Button onClick={clearBoard} variant="destructive" title="Clear All">
          <Trash2 className="h-4 w-4" />
        </Button>
        <Button onClick={downloadPNG} variant="outline" title="Download PNG">
          <Download className="h-4 w-4" />
        </Button>
      </div>
      
      {/* {mode && (
        <div className="text-sm text-muted-foreground">
          {isDrawing
            ? "Release mouse to finish drawing"
            : `Click and drag to draw a ${mode}`}
        </div>
      )} */}

      <div
        id="jxgbox"
        ref={boardRef}
        className="border-2 border-gray-300 rounded-lg shadow-lg"
        style={{ width: "600px", height: "500px" }}
      />
    </div>
  );
}
