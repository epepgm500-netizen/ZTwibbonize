import { Camera, CircleArrowRight, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from "lucide-react";

type TransformType = { x: number; y: number; scale: number; rotate: number; };
type AdjustPageProps = {
	transform: TransformType;
	setTransform: React.Dispatch<React.SetStateAction<TransformType>>;
	onPhotoSelected: (img: HTMLImageElement) => void;
	onGenerate: React.Dispatch<React.SetStateAction<"landing" | "adjust" | "ready">>;
};

export default function AdjustPageSidebar({ transform, setTransform, onPhotoSelected, onGenerate }: AdjustPageProps) {
	function handleChangePhoto(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (!file) return;
		const img = new Image();
		img.onload = () => onPhotoSelected(img);
		img.src = URL.createObjectURL(file);
	}

	// Fungsi geser pake tombol
	const movePhoto = (dir: "up" | "down" | "left" | "right") => {
		const step = 20; // Jarak geser tiap klik
		setTransform(prev => {
			let newX = prev.x;
			let newY = prev.y;
			if (dir === "up") newY -= step;
			if (dir === "down") newY += step;
			if (dir === "left") newX -= step;
			if (dir === "right") newX += step;
			return { ...prev, x: newX, y: newY };
		});
	};

	return (
		<section className="h-full flex flex-col gap-4 justify-between mt-4">
			<div className="flex flex-col gap-3">
				<div className="bg-gray-50 rounded-xl border border-gray-200 p-3">
					<label className="font-bold text-xs text-gray-700 flex justify-between mb-1"><span>Zoom</span> <span className="text-pink-600">{transform.scale}%</span></label>
					<input type="range" className="w-full accent-pink-500" value={transform.scale} onChange={(e) => setTransform((t) => ({ ...t, scale: +e.target.value }))} min={0} max={200} />
				</div>
				<div className="bg-gray-50 rounded-xl border border-gray-200 p-3">
					<label className="font-bold text-xs text-gray-700 flex justify-between mb-1"><span>Putar</span> <span className="text-pink-600">{transform.rotate}°</span></label>
					<input type="range" className="w-full accent-pink-500" value={transform.rotate} min={-180} max={180} onChange={(e) => setTransform((t) => ({ ...t, rotate: +e.target.value }))} />
				</div>

				{/* TOMBOL PANAH UNTUK GESER */}
				<div className="bg-gray-50 rounded-xl border border-gray-200 p-3">
					<label className="font-bold text-xs text-gray-700 mb-2 block text-center">Geser Posisi</label>
					<div className="flex flex-col items-center gap-1">
						<button onClick={() => movePhoto("up")} className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 active:bg-gray-200"><ArrowUp size={20} /></button>
						<div className="flex gap-1">
							<button onClick={() => movePhoto("left")} className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 active:bg-gray-200"><ArrowLeft size={20} /></button>
							<button onClick={() => movePhoto("down")} className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 active:bg-gray-200"><ArrowDown size={20} /></button>
							<button onClick={() => movePhoto("right")} className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 active:bg-gray-200"><ArrowRight size={20} /></button>
						</div>
					</div>
				</div>
			</div>

			<div className="flex gap-2 font-bold mt-2">
				<div className="flex-1 cursor-pointer border border-gray-300 bg-white hover:bg-gray-50 p-2 relative text-gray-700 rounded-lg text-center text-xs">
					<input onChange={handleChangePhoto} type="file" className="absolute inset-0 z-10 opacity-0 cursor-pointer" />
					<h3 className="flex justify-center items-center gap-1"><Camera size={14} /> Ganti</h3>
				</div>
				<div className="flex-1 cursor-pointer bg-gradient-to-r from-pink-500 to-purple-600 p-2 relative text-white rounded-lg text-center text-xs shadow-md">
					<button onClick={() => onGenerate("ready")} className="absolute inset-0 z-10 opacity-0 cursor-pointer" />
					<h3 className="flex justify-center items-center gap-1">Lanjut <CircleArrowRight size={14} /></h3>
				</div>
			</div>
		</section>
	);
}