import { useState } from "react";
import { ArrowDownToLine, Copy, Check, Edit3, Camera } from "lucide-react";

export default function DownloadPageSidebar({ canvas, isPremium, initialCaption, onReset }: { canvas: React.RefObject<HTMLCanvasElement | null>, isPremium: boolean, initialCaption: string, onReset: () => void }) {
	const [caption, setCaption] = useState(initialCaption || "Halo nama saya [name] dari [school]");
	const [isEditing, setIsEditing] = useState(false);
	const [isCopied, setIsCopied] = useState(false);

	function handleDownloadCanvas() {
		const currentCanvas = canvas.current;
		if (!currentCanvas) return;
		
		if (!isPremium) {
			const ctx = currentCanvas.getContext("2d");
			if (ctx) {
				ctx.font = "bold 60px sans-serif"; 
				ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
				ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
				ctx.lineWidth = 8;
				ctx.textAlign = "right";
				ctx.textBaseline = "bottom";
				ctx.strokeText("ZTwibbon Free", currentCanvas.width - 40, currentCanvas.height - 40);
				ctx.fillText("ZTwibbon Free", currentCanvas.width - 40, currentCanvas.height - 40);
			}
		}

		currentCanvas.toBlob((blob) => {
			if (!blob) return;
			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = `ZTwibbon-${Date.now()}.png`;
			document.body.appendChild(link);
			link.click();
			
			setTimeout(() => {
				document.body.removeChild(link);
				URL.revokeObjectURL(url);
			}, 100);
		}, "image/png", 1.0);
	}

	const handleCopy = () => {
		navigator.clipboard.writeText(caption);
		setIsCopied(true);
		setTimeout(() => setIsCopied(false), 2000);
	};

	return (
		<section className="flex flex-col gap-4 mt-6">
			<div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
				<div className="flex justify-between items-center mb-2">
					<label className="text-xs font-bold text-gray-600">Caption Twibbon</label>
					<button onClick={() => setIsEditing(!isEditing)} className="text-[10px] font-bold text-pink-600 hover:text-pink-700 flex items-center gap-1">
						<Edit3 size={12} /> {isEditing ? "Selesai" : "Edit"}
					</button>
				</div>
				
				{isEditing ? (
					<textarea 
						value={caption} 
						onChange={(e) => setCaption(e.target.value)} 
						className="w-full border p-2 rounded text-sm h-20 resize-none focus:outline-none focus:border-pink-500 text-black"
					/>
				) : (
					<p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-200 italic">
						"{caption}"
					</p>
				)}

				<button onClick={handleCopy} className="w-full mt-3 bg-white border border-gray-300 text-gray-700 font-bold py-2 rounded-lg text-xs flex justify-center items-center gap-2 hover:bg-gray-100 transition-colors">
					{isCopied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
					{isCopied ? "Tercopy!" : "Copy Caption"}
				</button>
			</div>

			<button onClick={handleDownloadCanvas} className="w-full flex items-center justify-center gap-2 font-bold cursor-pointer bg-gradient-to-r from-pink-500 to-purple-600 p-4 text-white rounded-xl shadow-[0_10px_20px_rgba(236,72,153,0.3)] hover:shadow-[0_10px_30px_rgba(236,72,153,0.5)] hover:-translate-y-1 transition-all text-sm uppercase tracking-wide">
				<ArrowDownToLine size={20} />
				Download Gambar HD
			</button>

			<button onClick={onReset} className="w-full flex items-center justify-center gap-2 font-bold cursor-pointer bg-gray-200 text-gray-700 p-3 rounded-xl hover:bg-gray-300 transition-all text-xs mt-2">
				<Camera size={16} />
				Ganti Foto / Mulai Ulang
			</button>
		</section>
	);
}