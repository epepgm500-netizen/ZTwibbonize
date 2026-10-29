import { useEffect, useRef } from "react";

type TransformType = { x: number; y: number; scale: number; rotate: number; };
type CanvasProps = {
	isEditMode: boolean;
	transform: TransformType;
	setTransform: React.Dispatch<React.SetStateAction<TransformType>>;
	userPhoto: HTMLImageElement | null;
	frameSrc: string;
	canvasRef: React.RefObject<HTMLCanvasElement | null>;
};

export default function TwibbonCanvas({ userPhoto, transform, frameSrc, isEditMode, setTransform, canvasRef }: CanvasProps) {
	const size = 1000;
	const frameRef = useRef(new Image());

	function draw() {
		const canvas = canvasRef?.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		
		if (ctx) {
			ctx.imageSmoothingEnabled = true;
			ctx.imageSmoothingQuality = "high";
		}

		ctx?.clearRect(0, 0, size, size);

		if (userPhoto) {
			ctx?.save();
			ctx?.translate(size / 2 + transform.x, size / 2 + transform.y);
			ctx?.rotate((transform.rotate * Math.PI) / 180);
			ctx?.scale(transform.scale / 100, transform.scale / 100);
			ctx?.drawImage(userPhoto, -userPhoto.width / 2, -userPhoto.height / 2);
			ctx?.restore();
		}
		ctx?.drawImage(frameRef.current, 0, 0, size, size);
	}

	useEffect(() => {
		frameRef.current.src = frameSrc;
		frameRef.current.onload = draw;
	}, [frameSrc]);

	useEffect(draw, [userPhoto, transform]);

	const isDragging = useRef(false);
	const lastPos = useRef({ x: 0, y: 0 });

	function handleDragDown(e: React.PointerEvent<HTMLCanvasElement>) {
		if (!isEditMode || !userPhoto) return;
		isDragging.current = true;
		lastPos.current = { x: e.clientX, y: e.clientY };
		e.currentTarget.setPointerCapture(e.pointerId);
	}

	function handleDragMove(e: React.PointerEvent<HTMLCanvasElement>) {
		if (!isEditMode || !isDragging.current || !userPhoto) return;
		const dx = e.clientX - lastPos.current.x;
		const dy = e.clientY - lastPos.current.y;
		lastPos.current = { x: e.clientX, y: e.clientY };
		const canvas = canvasRef.current!;
		const ratio = canvas.width / canvas.clientWidth;
		setTransform((prev) => ({ ...prev, x: prev.x + dx * ratio, y: prev.y + dy * ratio }));
	}

	function handleDragUp() {
		if (!isEditMode || !userPhoto) return;
		isDragging.current = false;
	}

	return (
		<div className="relative w-full aspect-square rounded-xl overflow-hidden bg-[#1a1d24] flex items-center justify-center border border-white/10 shadow-2xl">
			{/* BACKGROUND GRID & GLOW (Animasi CSS) */}
			<div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]"></div>
			<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-pink-500/20 rounded-full blur-[100px] animate-pulse pointer-events-none"></div>
			<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1/2 h-1/2 bg-blue-500/20 rounded-full blur-[80px] animate-pulse delay-1000 pointer-events-none"></div>

			{/* KANVAS ASLI */}
			<canvas 
				ref={canvasRef} 
				width={size} 
				height={size} 
				className={`relative z-10 w-full h-full object-contain ${isEditMode && userPhoto ? "cursor-move" : "cursor-default"}`} 
				onPointerDown={handleDragDown} 
				onPointerMove={handleDragMove} 
				onPointerUp={handleDragUp} 
			/>
		</div>
	);
}