import { Camera } from "lucide-react";

export default function LandingPageSidebar({ onPhotoSelected }: { onPhotoSelected: (img: HTMLImageElement) => void }) {
	function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (!file) return;
		const img = new Image();
		img.onload = () => onPhotoSelected(img);
		img.src = URL.createObjectURL(file);
	}

	return (
		<section className="h-full flex flex-col gap-4 justify-center mt-4">
			<div className="relative cursor-pointer bg-gradient-to-r from-pink-500 to-purple-600 p-4 text-white rounded-xl w-full text-center shadow-lg hover:scale-[1.02] transition-transform">
				<input onChange={handleUpload} accept="image/*" type="file" className="absolute inset-0 z-10 opacity-0 cursor-pointer" />
				<h3 className="flex items-center justify-center gap-2 font-bold text-sm">
					<Camera size={18} />
					Upload Foto Kamu
				</h3>
			</div>
		</section>
	);
}