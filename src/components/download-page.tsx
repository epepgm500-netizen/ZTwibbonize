import { useState } from "react";
import { ArrowDownToLine } from "lucide-react";

export default function DownloadPageSidebar({ canvas, isPremium }: { canvas: React.RefObject<HTMLCanvasElement | null>, isPremium: boolean }) {
	const [name, setName] = useState("");
	const [school, setSchool] = useState("");

	function handleDownloadCanvas(canvas: React.RefObject<HTMLCanvasElement | null>, filename: string) {
		if (!canvas.current) return;
		
		if (!isPremium) {
			const ctx = canvas.current.getContext("2d");
			if (ctx) {
				ctx.font = "bold 60px sans-serif"; 
				ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
				ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
				ctx.lineWidth = 8;
				ctx.textAlign = "right";
				ctx.textBaseline = "bottom";
				ctx.strokeText("ZTwibbon Free", canvas.current.width - 40, canvas.current.height - 40);
				ctx.fillText("ZTwibbon Free", canvas.current.width - 40, canvas.current.height - 40);
			}
		}

		const dataUrl = canvas.current.toDataURL("image/png", 1.0);
		const link = document.createElement("a");
		link.href = dataUrl;
		link.download = filename;
		link.click();
	}

	return (
		<section className="flex flex-col gap-4 mt-6">
			<div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
				<label className="block text-xs font-bold text-gray-600 mb-2">Isi Caption Lu:</label>
				<input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama Lu" className="w-full border p-2 rounded mb-2 text-sm" />
				<input type="text" value={school} onChange={(e) => setSchool(e.target.value)} placeholder="Asal Sekolah" className="w-full border p-2 rounded text-sm" />
			</div>

			<button onClick={() => handleDownloadCanvas(canvas, "twibbon-hd.png")} className="w-full flex items-center justify-center gap-2 font-bold cursor-pointer bg-gradient-to-r from-pink-500 to-purple-600 p-4 text-white rounded-xl shadow-[0_10px_20px_rgba(236,72,153,0.3)] hover:shadow-[0_10px_30px_rgba(236,72,153,0.5)] hover:-translate-y-1 transition-all text-sm uppercase tracking-wide">
				<ArrowDownToLine size={20} />
				Download Gambar HD
			</button>
		</section>
	);
}