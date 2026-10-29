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
	const size = 1000; // Resolusi HD
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

	return <canvas ref={canvasRef} width={size} height={size} className={`w-full h-auto bg-white/5 ${isEditMode && userPhoto ? "cursor-move" : "cursor-default"}`} onPointerDown={handleDragDown} onPointerMove={handleDragMove} onPointerUp={handleDragUp} />;
}