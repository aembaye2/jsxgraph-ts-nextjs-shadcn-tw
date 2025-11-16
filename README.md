# 
git add .

git commit -m "committed on 11/15/2025"

git fetch origin

git push -u origin main




# JSXGraph Drawing App

A Next.js application with TypeScript, Tailwind CSS, shadcn UI, and JSXGraph for interactive geometric drawing.

## Features

- **Interactive Drawing**: Draw lines, rectangles, and circles using mouse interactions
- **Mouse Controls**: 
  - Mouse down to start drawing
  - Mouse move to update the shape in real-time
  - Mouse up to finish drawing
- **Modern UI**: Built with shadcn UI components and Tailwind CSS
- **TypeScript**: Fully typed for better development experience
- **JSXGraph Integration**: Powerful mathematical visualization library

## Tech Stack

- **Next.js 16** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn UI** - High-quality React components
- **JSXGraph** - Interactive geometry and plotting library

## Getting Started

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## How to Use

1. **Select a Drawing Mode**: Click on one of the icon buttons:
   - **Minus icon** (─) - Draw straight lines
   - **Slash icon** (/) - Draw line segments  
   - **Square icon** (▢) - Draw rectangles
   - **Circle icon** (○) - Draw circles

2. **Draw a Shape**:
   - Click and hold the mouse button at your starting point
   - Drag the mouse to see the shape update in real-time
   - Release the mouse button to finish drawing

3. **Edit Your Work**:
   - **Undo icon** - Undo the last action
   - **Redo icon** - Redo the last undone action
   - **Trash icon** - Clear all drawings (with confirmation)

4. **Tooltips**: Hover over any button to see its description

5. **Draw Multiple Shapes**: You can draw multiple shapes of different types on the same board

## Project Structure

```
├── app/
│   ├── page.tsx          # Main page component
│   └── globals.css       # Global styles
├── components/
│   ├── DrawingBoard.tsx  # Main drawing component with JSXGraph
│   └── ui/
│       └── button.tsx    # shadcn Button component
├── types/
│   └── jsxgraph.d.ts     # TypeScript definitions for JSXGraph
└── package.json
```

## Customization

- Board size: Edit the width and height in DrawingBoard.tsx
- Colors: Modify the strokeColor and fillColor properties
- Board bounds: Adjust the boundingbox parameter
