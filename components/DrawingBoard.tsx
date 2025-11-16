"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Slash, Square, Circle, Undo, Redo, Trash2, Dot, Triangle, Download, MoveUpRight, MoveDiagonal, Spline, FileJson } from "lucide-react";


type DrawingMode = "point" | "segment" | "arrow" | "doubleArrow" | "triangle" | "rectangle" | "circle" | "curve" | null;

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
  const curvePointsRef = useRef<any[]>([]);
  const trianglePointsRef = useRef<Point[]>([]);
  const trianglePreviewRef = useRef<any>(null);
  const triangleDrawingRef = useRef<boolean>(false);
  
  const undoStackRef = useRef<any[][]>([]);
  const redoStackRef = useRef<any[][]>([]);
  const [version, setVersion] = useState(0);
  const JSXGraphRef = useRef<any>(null);
  const boundingBox: [number, number, number, number] = [-1, 11, 11, -1];

  // Cleanup function when changing modes
  const cleanupCurrentMode = () => {
    if (mode === "triangle" && board) {
      // Clean up triangle preview objects
      if (trianglePreviewRef.current) {
        const { previewTriangle, p1, p2, p3 } = trianglePreviewRef.current;
        try {
          if (previewTriangle) board.removeObject(previewTriangle);
          if (p1) board.removeObject(p1);
          if (p2) board.removeObject(p2);
          if (p3) board.removeObject(p3);
        } catch (e) {
          // Ignore errors if objects already removed
        }
        trianglePreviewRef.current = null;
      }
      
      if (currentShape?.startCircle) {
        try {
          board.removeObject(currentShape.startCircle);
        } catch (e) {
          // Ignore
        }
      }
      
      if (currentShape?.previewLine) {
        try {
          board.removeObject(currentShape.previewLine);
          // Also remove the points of the preview line
          if (currentShape.previewLine.point1) board.removeObject(currentShape.previewLine.point1);
          if (currentShape.previewLine.point2) board.removeObject(currentShape.previewLine.point2);
        } catch (e) {
          // Ignore
        }
      }
      
      trianglePointsRef.current = [];
    }
    
    if (mode === "curve") {
      curvePointsRef.current = [];
    }
    
    setCurrentShape(null);
    setIsDrawing(false);
    setStartPoint(null);
  };

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

      // For triangle mode, only set isDrawing if not finalizing (third click)
      const isTriangleThirdClick = mode === "triangle" && trianglePointsRef.current.length === 2;
      
      if (!isTriangleThirdClick) {
        setIsDrawing(true);
      }
      
      setStartPoint({
        x: coords.usrCoords[1],
        y: coords.usrCoords[2],
      });

      if (mode === "point") {
        const point = board.create("point", [coords.usrCoords[1], coords.usrCoords[2]], {
          size: 4,
          face: 'circle',
          fillColor: "#3b82f6",
          strokeColor: "#3b82f6",
          fixed: true,
        });
        setCurrentShape(point);
        return;
      }

      else if (mode === "triangle") {
        const x = coords.usrCoords[1];
        const y = coords.usrCoords[2];
        const points = trianglePointsRef.current;

        // First click: add first vertex and preview segment to cursor
        if (points.length === 0) {
          points.push({ x, y });
          const startCircle = board.create("point", [x, y], {
            size: 3,
            fillColor: "#f59e0b",
            strokeColor: "#f59e0b",
            fixed: true,
            name: '',
          });

          const previewP1 = board.create("point", [x, y], { visible: false, fixed: true });
          const previewP2 = board.create("point", [x, y], { visible: false, fixed: true });
          const previewLine = board.create("segment", [previewP1, previewP2], {
            strokeColor: "#f59e0b",
            strokeWidth: 2,
            fixed: true,
          });

          setCurrentShape({ startCircle, previewLine });
          triangleDrawingRef.current = true;
          setIsDrawing(true);
          return;
        }

        // Second click: add second vertex and start preview triangle
        if (points.length === 1) {
          points.push({ x, y });

          if (currentShape?.previewLine) {
            try {
              if (currentShape.previewLine.point1) board.removeObject(currentShape.previewLine.point1);
              if (currentShape.previewLine.point2) board.removeObject(currentShape.previewLine.point2);
              board.removeObject(currentShape.previewLine);
            } catch (err) {
              // ignore
            }
          }

          const p1 = board.create("point", [points[0].x, points[0].y], { visible: false, fixed: true });
          const p2 = board.create("point", [points[1].x, points[1].y], { visible: false, fixed: true });
          const p3 = board.create("point", [x, y], { visible: false, fixed: true });
          const previewTriangle = board.create("polygon", [p1, p2, p3], {
            fillColor: "#fbbf24",
            fillOpacity: 0.2,
            borders: {
              strokeColor: "#f59e0b",
              strokeWidth: 2,
            },
            fixed: true,
          });

          trianglePreviewRef.current = { previewTriangle, p1, p2, p3 };
          setCurrentShape({ ...currentShape, previewTriangle, p3 });
          triangleDrawingRef.current = true;
          setIsDrawing(true);
          return;
        }

        // If already have two points, ignore single click — we'll finalize on dblclick.
        if (points.length >= 2) {
          return;
        }
      } else if (mode === "curve") {
        // Start or continue collecting points for a Catmull-Rom spline curve.
        const x = coords.usrCoords[1];
        const y = coords.usrCoords[2];

        const newPoint = board.create("point", [x, y], {
          size: 2,
          visible: true,
          face: 'o',
          fillColor: '#10b981',
          strokeColor: '#065f46',
          fixed: false,
        });

        // Add to ref list and state holder
        const pts = curvePointsRef.current || [];
        pts.push(newPoint);
        curvePointsRef.current = pts;
        setCurrentShape({ points: pts, curve: null });
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
        // Use triangleDrawingRef to synchronously allow/disable preview updates
        if (!triangleDrawingRef.current) {
          board.unsuspendUpdate();
          return;
        }

        const points = trianglePointsRef.current;

        // If we have one point, update preview line from first point to cursor
        if (points.length === 1 && currentShape?.previewLine) {
          // Update the second point of the preview line to follow cursor
          try {
            currentShape.previewLine.point2.setPosition((window as any).JXG.COORDS_BY_USER, [currentX, currentY]);
          } catch (err) {
            // ignore if previewLine was removed
          }
        }

        // If we have two points, update preview triangle's third point to follow cursor
        // This will update both the second and third sides of the triangle
        if (points.length === 2 && trianglePreviewRef.current?.p3) {
          try {
            trianglePreviewRef.current.p3.setPosition((window as any).JXG.COORDS_BY_USER, [currentX, currentY]);
          } catch (err) {
            // ignore if preview points were removed
          }
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
      } else if (mode === "curve") {
        const pts = currentShape?.points || curvePointsRef.current || [];
        if (pts.length > 0) {
          const last = pts[pts.length - 1];
          last.setPosition((window as any).JXG.COORDS_BY_USER, [currentX, currentY]);
        }
      }

      board.unsuspendUpdate();
    };

    const handleMouseUp = (e: MouseEvent) => {
      const coords = getMouseCoords(e);
      if (!coords) return;

      if (!isDrawing || !currentShape) return;

      if (mode === "triangle") {
        // Triangle is handled entirely in mousedown with click-based approach
        return;
      }

      if (mode === "curve") {
        const pts = currentShape?.points || curvePointsRef.current || [];
        if (pts.length === 0) {
          setIsDrawing(false);
          setCurrentShape(null);
          setStartPoint(null);
          return;
        }

        // Finalize the last point position
        const last = pts[pts.length - 1];
        last.setAttribute({ fixed: true });

        // If we have reached 4 points, create the Catmull-Rom spline and finish
        if (pts.length >= 4) {
          try {
            const c = board.create(
              "curve",
              (window as any).JXG.Math.Numerics.CatmullRomSpline(pts),
              {
                strokeWidth: 3,
                strokeColor: '#10b981',
              }
            );

            const shapeObjects = [c, ...pts];
            undoStackRef.current.push(shapeObjects);
            redoStackRef.current = [];
            setVersion((v) => v + 1);
          } catch (err) {
            console.error("Failed to create curve:", err);
          }

          // clear refs/state
          curvePointsRef.current = [];
          setCurrentShape(null);
          setIsDrawing(false);
          setStartPoint(null);
          return;
        }

        // If less than 4 points, leave points collected and allow more clicks/drags
        setIsDrawing(false);
        setStartPoint(null);
        setCurrentShape({ points: pts, curve: null });
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

    const handleDoubleClick = (e: MouseEvent) => {
      if (!board) return;
      if (mode !== "triangle") return;
      const coords = getMouseCoords(e);
      if (!coords) return;

      const points = trianglePointsRef.current;
      if (points.length !== 2) return;

      const x = coords.usrCoords[1];
      const y = coords.usrCoords[2];

      // Finalize triangle on double click
      points.push({ x, y });
      triangleDrawingRef.current = false;
      setIsDrawing(false);
      const cs = currentShape;
      setCurrentShape(null);

      // Remove preview objects
      if (trianglePreviewRef.current) {
        const { previewTriangle, p1, p2, p3 } = trianglePreviewRef.current;
        try {
          if (previewTriangle) board.removeObject(previewTriangle);
          if (p1) board.removeObject(p1);
          if (p2) board.removeObject(p2);
          if (p3) board.removeObject(p3);
        } catch (err) {}
      }

      if (cs?.startCircle) {
        try {
          board.removeObject(cs.startCircle);
        } catch (err) {}
      }

      // Create final triangle using coordinate arrays (not linked to preview points)
      const finalTriangle = board.create("polygon", [
        [points[0].x, points[0].y],
        [points[1].x, points[1].y],
        [points[2].x, points[2].y],
      ], {
        fillColor: "#fbbf24",
        fillOpacity: 0.2,
        borders: {
          strokeColor: "#f59e0b",
          strokeWidth: 2,
        },
        fixed: true,
      });

      // Add to undo stack
      undoStackRef.current.push([finalTriangle]);
      redoStackRef.current = [];
      setVersion((v) => v + 1);

      // Update board and reset state
      try {
        finalTriangle.setAttribute({ fixed: true });
        finalTriangle.update && finalTriangle.update();
        board.update && board.update();
      } catch (err) {}

      trianglePointsRef.current = [];
      trianglePreviewRef.current = null;
      triangleDrawingRef.current = false;
      setCurrentShape(null);
      setStartPoint(null);
    };

    const boardElement = boardRef.current;
    if (boardElement) {
      boardElement.addEventListener("mousedown", handleMouseDown);
      boardElement.addEventListener("mousemove", handleMouseMove);
      boardElement.addEventListener("mouseup", handleMouseUp);
      boardElement.addEventListener("dblclick", handleDoubleClick as any);
      boardElement.addEventListener("mouseleave", handleMouseUp);

      // Escape key handler to cancel triangle drawing
      const handleKeyDown = (ev: KeyboardEvent) => {
        if (ev.key === "Escape" && mode === "triangle" && triangleDrawingRef.current && board) {
          // Remove any preview objects and reset state
          try {
            // remove preview triangle
            if (trianglePreviewRef.current) {
              const { previewTriangle, p1, p2, p3 } = trianglePreviewRef.current;
              if (previewTriangle) board.removeObject(previewTriangle);
              if (p1) board.removeObject(p1);
              if (p2) board.removeObject(p2);
              if (p3) board.removeObject(p3);
            }
            // remove preview line points
            if (currentShape?.previewLine) {
              try {
                if (currentShape.previewLine.point1) board.removeObject(currentShape.previewLine.point1);
                if (currentShape.previewLine.point2) board.removeObject(currentShape.previewLine.point2);
                board.removeObject(currentShape.previewLine);
              } catch (err) {}
            }
            if (currentShape?.startCircle) {
              try { board.removeObject(currentShape.startCircle); } catch (err) {}
            }
          } catch (err) {}

          trianglePointsRef.current = [];
          trianglePreviewRef.current = null;
          triangleDrawingRef.current = false;
          setCurrentShape(null);
          setIsDrawing(false);
          setStartPoint(null);
        }
      };
      document.addEventListener("keydown", handleKeyDown);

      return () => {
        boardElement.removeEventListener("mousedown", handleMouseDown);
        boardElement.removeEventListener("mousemove", handleMouseMove);
        boardElement.removeEventListener("mouseup", handleMouseUp);
        boardElement.removeEventListener("dblclick", handleDoubleClick as any);
        boardElement.removeEventListener("mouseleave", handleMouseUp);
        document.removeEventListener("keydown", handleKeyDown);
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

  const downloadJSON = () => {
    if (!board) return;

    try {
      // Get all objects from the board
      const objects: any[] = [];
      
      for (const id in board.objects) {
        const obj = board.objects[id];
        
        // Skip axes and grid elements
        if (obj.elType === 'axis' || obj.elType === 'ticks' || obj.elType === 'grid' || 
            obj.name === 'x' || obj.name === 'y') {
          continue;
        }
        
        // Create a simplified representation of each object
        const objData: any = {
          id: obj.id,
          type: obj.elType,
          name: obj.name || undefined,
        };
        
        // Add type-specific data
        if (obj.elType === 'point') {
          objData.coords = {
            x: obj.X(),
            y: obj.Y(),
          };
          objData.properties = {
            size: obj.visProp.size,
            fillColor: obj.visProp.fillcolor,
            strokeColor: obj.visProp.strokecolor,
            face: obj.visProp.face,
          };
        } else if (obj.elType === 'line' || obj.elType === 'segment' || obj.elType === 'arrow') {
          objData.point1 = obj.point1 ? { x: obj.point1.X(), y: obj.point1.Y() } : null;
          objData.point2 = obj.point2 ? { x: obj.point2.X(), y: obj.point2.Y() } : null;
          objData.properties = {
            strokeColor: obj.visProp.strokecolor,
            strokeWidth: obj.visProp.strokewidth,
          };
        } else if (obj.elType === 'polygon') {
          objData.vertices = obj.vertices.map((v: any) => ({
            x: v.X(),
            y: v.Y(),
          }));
          objData.properties = {
            fillColor: obj.visProp.fillcolor,
            fillOpacity: obj.visProp.fillopacity,
            strokeColor: obj.visProp.strokecolor,
            strokeWidth: obj.visProp.strokewidth,
          };
        } else if (obj.elType === 'circle') {
          objData.center = obj.center ? { x: obj.center.X(), y: obj.center.Y() } : null;
          objData.radius = obj.Radius();
          objData.properties = {
            fillColor: obj.visProp.fillcolor,
            fillOpacity: obj.visProp.fillopacity,
            strokeColor: obj.visProp.strokecolor,
            strokeWidth: obj.visProp.strokewidth,
          };
        } else if (obj.elType === 'curve') {
          // For curves, try to get point data
          objData.properties = {
            strokeColor: obj.visProp.strokecolor,
            strokeWidth: obj.visProp.strokewidth,
          };
        }
        
        objects.push(objData);
      }
      
      const jsonData = {
        version: '1.0',
        boardSettings: {
          boundingBox: board.getBoundingBox(),
        },
        objects: objects,
        timestamp: new Date().toISOString(),
      };
      
      const jsonString = JSON.stringify(jsonData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = 'drawing.json';
      document.body.appendChild(a);
      a.click();
      
      setTimeout(() => {
        a.remove();
        URL.revokeObjectURL(url);
      }, 100);
    } catch (err) {
      console.error(err);
      alert('Failed to export drawing as JSON');
    }
  };

  const handleModeChange = (newMode: DrawingMode) => {
    cleanupCurrentMode();
    setMode(newMode);
  };

  return (
    <div className="flex flex-col items-center gap-4 p-8">
      <div className="flex items-center gap-1 flex-nowrap">
        <Button
          onClick={() => handleModeChange("point")}
          variant={mode === "point" ? "default" : "outline"}
          title="Draw Point"
        >
          <Dot className="h-4 w-4" />
        </Button>
        <Button
          onClick={() => handleModeChange("segment")}
          variant={mode === "segment" ? "default" : "outline"}
          title="Draw Segment"
        >
          <Slash className="h-4 w-4" />
        </Button>

        <Button
          onClick={() => handleModeChange("arrow")}
          variant={mode === "arrow" ? "default" : "outline"}
          title="Draw Arrow"
        >
          <MoveUpRight className="h-4 w-4" />
        </Button>
        <Button
          onClick={() => handleModeChange("doubleArrow")}
          variant={mode === "doubleArrow" ? "default" : "outline"}
          title="Draw Double Arrow"
        >
          <MoveDiagonal className="h-4 w-4" />
        </Button>
        <Button
          onClick={() => handleModeChange("triangle")}
          variant={mode === "triangle" ? "default" : "outline"}
          title="Draw Triangle"
        >
          <Triangle className="h-4 w-4" />
        </Button>
        {/* Preview points toggle removed to avoid duplicating point tool in toolbar */}
        <Button
          onClick={() => handleModeChange("curve")}
          variant={mode === "curve" ? "default" : "outline"}
          title="Draw Curve"
        >
          <Spline className="h-4 w-4 rotate-270" />
        </Button>
        
        <Button
          onClick={() => handleModeChange("rectangle")}
          variant={mode === "rectangle" ? "default" : "outline"}
          title="Draw Rectangle"
        >
          <Square className="h-4 w-4" />
        </Button>
        <Button
          onClick={() => handleModeChange("circle")}
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
        <Button onClick={downloadJSON} variant="outline" title="Download JSON">
          <FileJson className="h-4 w-4" />
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
