import { useState, useRef, useEffect } from "react";
import "./App.css";
import TwibbonCanvas from "./components/twibbon-canvas";
import LandingPageSidebar from "./components/landing-page";
import AdjustPageSidebar from "./components/adjust-page";
import DownloadPageSidebar from "./components/download-page";
import { supabase } from "./supabase"; // Import koneksi database

const EMPTY_FRAME = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

function App() {
	const [appState, setAppState] = useState<"home" | "editor">("home");
	const [isPremium, setIsPremium] = useState(false);
	const [keyInput, setKeyInput] = useState("");
	
	const [sidebarState, setSidebarState] = useState<"landing" | "adjust" | "ready">("landing");
	const [userPhoto, setUserPhoto] = useState<HTMLImageElement | null>(null);
	const [photoTransform, setPhotoTransform] = useState({ x: 0, y: 0, scale: 100, rotate: 0 });
	const canvasRef = useRef<HTMLCanvasElement>(null);
	
	const [activeFrame, setActiveFrame] = useState<string>(EMPTY_FRAME);
	const [campaignTitle, setCampaignTitle] = useState("Twibbon Pro Event");
	const [campaignCaption, setCampaignCaption] = useState("Halo nama saya [name]");
	const [showMaintenance, setShowMaintenance] = useState(false);
	const [isModeratorMode, setIsModeratorMode] = useState(false);

	// State Modal & Upload
	const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
	const [generatedLink, setGeneratedLink] = useState("");
	const [isGenerating, setIsGenerating] = useState(false);
	const [isCopied, setIsCopied] = useState(false);
	const [isUploadingFrame, setIsUploadingFrame] = useState(false);

	// State Pop-up
	const [popup, setPopup] = useState<{show: boolean, title: string, message: string, type: "error" | "success"}>({show: false, title: "", message: "", type: "error"});

	const triggerPopup = (title: string, message: string, type: "error" | "success" = "error") => {
		setPopup({ show: true, title, message, type });
	};

	// Cek URL pas dibuka (Buat nangkep ID Campaign)
	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		const campaignId = params.get("id");

		if (campaignId) {
			// Kalau ada ID di URL, tarik data dari Supabase
			async function fetchCampaign() {
				const { data, error } = await supabase.from('campaigns').select('*').eq('id', campaignId).single();
				if (data) {
					setCampaignTitle(data.title);
					setCampaignCaption(data.caption);
					setActiveFrame(data.frame_url);
					setAppState("editor");
					setIsModeratorMode(false);
					if (params.get("pro") === "true") setIsPremium(true);
				} else {
					triggerPopup("Error", "Campaign tidak ditemukan.", "error");
				}
			}
			fetchCampaign();
		}
	}, []);

	const handleClaimPremium = () => {
		if (keyInput === 'ZTWIBBON') {
			setIsPremium(true);
			setIsModeratorMode(true);
			setAppState("editor");
		} else { 
			triggerPopup("Akses Ditolak", "Key Pro yang lu masukin salah.", "error");
		}
	};

	// --- UPLOAD FRAME KE SUPABASE STORAGE ---
	const handleFrameUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = (event) => { if (event.target?.result) setActiveFrame(event.target.result as string); };
		reader.readAsDataURL(file);

		setIsUploadingFrame(true);
		
		// Bikin nama file unik
		const fileExt = file.name.split('.').pop();
		const fileName = `${Math.random()}.${fileExt}`;
		const filePath = `${fileName}`;

		// Upload ke bucket 'frames'
		const { error: uploadError } = await supabase.storage.from('frames').upload(filePath, file);

		if (uploadError) {
			triggerPopup("Gagal Upload", "Gagal upload ke Supabase. Cek koneksi.", "error");
		} else {
			// Ambil URL publicnya
			const { data } = supabase.storage.from('frames').getPublicUrl(filePath);
			setActiveFrame(data.publicUrl);
			triggerPopup("Berhasil!", "Frame berhasil di-upload.", "success");
		}
		setIsUploadingFrame(false);
	};

	const isFormComplete = campaignTitle.trim() !== "" && campaignCaption.trim() !== "" && activeFrame !== EMPTY_FRAME && !isUploadingFrame;

	// --- SIMPAN KE DATABASE & GENERATE LINK ---
	const generateLinkProcess = async () => {
		if (!isFormComplete) return;
		setIsLinkModalOpen(true);
		setIsGenerating(true);
		setIsCopied(false);
		setGeneratedLink("");

		// Simpan data ke tabel 'campaigns'
		const { data, error } = await supabase.from('campaigns').insert([
			{ 
				title: campaignTitle, 
				caption: campaignCaption, 
				frame_url: activeFrame 
			}
		]).select().single();

		if (error) {
			triggerPopup("Gagal", "Gagal menyimpan ke database.", "error");
			setIsLinkModalOpen(false);
		} else {
			// Bikin link pake ID dari Supabase
			const shareUrl = `${window.location.origin}/?id=${data.id}&pro=${isPremium}`;
			setGeneratedLink(shareUrl);
		}
		setIsGenerating(false);
	};

	const handleCopyLink = () => {
		navigator.clipboard.writeText(generatedLink);
		setIsCopied(true);
		setTimeout(() => setIsCopied(false), 3000);
	};

	const CustomPopup = () => {
		if (!popup.show) return null;
		return (
			<div className="fixed inset-0 z-[100] flex justify-center items-center bg-black/70 backdrop-blur-md animate-in fade-in duration-300 p-4">
				<div className="bg-white p-8 rounded-[2rem] shadow-2xl text-center max-w-sm w-full animate-in zoom-in-95 duration-300">
					<div className={`text-6xl mb-4 ${popup.type === 'error' ? 'shake-anim' : 'animate-bounce'}`}>
						{popup.type === 'error' ? '❌' : '✅'}
					</div>
					<h2 className={`text-2xl font-black mb-2 tracking-tight ${popup.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>
						{popup.title}
					</h2>
					<p className="text-gray-500 font-medium mb-6">{popup.message}</p>
					<button onClick={() => setPopup({ ...popup, show: false })} className="w-full bg-gray-900 text-white font-bold py-3 rounded-xl hover:bg-gray-800 transition-colors active:scale-95">
						Mengerti
					</button>
				</div>
			</div>
		);
	};

	if (appState === "home") {
		return (
			<main className="w-screen h-screen flex flex-col justify-center items-center bg-[#0f172a] relative overflow-hidden font-sans">
				<CustomPopup />

				{showMaintenance && (
					<div className="fixed inset-0 z-[90] flex justify-center items-center bg-black/70 backdrop-blur-lg animate-in fade-in zoom-in duration-300">
						<div className="bg-white p-10 rounded-[2rem] shadow-[0_0_50px_rgba(255,255,255,0.2)] text-center max-w-sm mx-4 transform transition-all">
							<div className="text-7xl mb-6 animate-bounce">🚧</div>
							<h2 className="text-3xl font-black text-gray-800 mb-3 tracking-tighter">MAINTENANCE</h2>
							<p className="text-gray-500 font-medium mb-8">Versi Free lagi dibenerin. Segera hadir ya!</p>
							<button onClick={() => setShowMaintenance(false)} className="w-full bg-gray-900 text-white font-bold py-4 rounded-xl hover:bg-gray-800 transition-colors active:scale-95">Mengerti</button>
						</div>
					</div>
				)}

				<div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-pink-600 rounded-full blur-[150px] opacity-20"></div>
				<div className="relative z-10 text-center mb-16 animate-in slide-in-from-top duration-700">
					<h1 className="text-6xl font-extrabold text-white mb-6 tracking-tight drop-shadow-2xl">ZTwibbon <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400">Studio</span></h1>
					<p className="text-gray-400 text-lg">Bikin twibbon keren tanpa watermark.</p>
				</div>

				<div className="relative z-10 flex flex-col md:flex-row gap-8 w-full max-w-4xl px-6">
					<div onClick={() => setShowMaintenance(true)} className="flex-1 bg-gradient-to-b from-gray-500/10 to-gray-500/5 backdrop-blur-xl border border-gray-500/30 p-10 rounded-[2rem] shadow-[0_0_40px_rgba(156,163,175,0.15)] text-center transition-all duration-500 hover:scale-110 hover:-translate-y-4 hover:shadow-[0_0_80px_rgba(156,163,175,0.6)] hover:border-gray-500/80 group relative z-20 cursor-pointer grayscale opacity-50">
						<div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-gray-600 to-gray-400 text-white text-xs font-bold px-6 py-1.5 rounded-full shadow-lg tracking-widest">COMING SOON</div>
						<div className="text-6xl mb-6 transform group-hover:scale-110 group-hover:-rotate-12 transition-transform duration-500 drop-shadow-[0_0_15px_rgba(156,163,175,0.8)]">🆓</div>
						<h2 className="text-3xl font-bold text-gray-400 mb-3">Versi Free</h2>
					</div>

					<div className="flex-1 bg-gradient-to-b from-pink-500/10 to-purple-500/5 backdrop-blur-xl border border-pink-500/30 p-10 rounded-[2rem] shadow-[0_0_40px_rgba(236,72,153,0.15)] text-center transition-all duration-500 hover:scale-110 hover:-translate-y-4 hover:shadow-[0_0_80px_rgba(236,72,153,0.6)] hover:border-pink-500/80 group relative z-20">
						<div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-pink-500 to-purple-500 text-white text-xs font-bold px-6 py-1.5 rounded-full shadow-lg tracking-widest">PALING LARIS</div>
						<div className="text-6xl mb-6 transform group-hover:scale-110 group-hover:-rotate-12 transition-transform duration-500 drop-shadow-[0_0_15px_rgba(236,72,153,0.8)]">👑</div>
						<h2 className="text-3xl font-bold text-white mb-3">Versi Pro</h2>
						<input type="text" value={keyInput} onChange={(e) => setKeyInput(e.target.value)} className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-center text-white mb-4 text-sm focus:outline-none focus:border-pink-500 transition-all placeholder-gray-500" placeholder="Masukin Key Pro" />
						<button onClick={handleClaimPremium} className="w-full bg-gradient-to-r from-pink-600 to-purple-600 text-white font-bold py-4 rounded-xl shadow-[0_10px_20px_rgba(236,72,153,0.3)] group-hover:shadow-[0_10px_40px_rgba(236,72,153,0.8)] transition-all uppercase tracking-wider">Aktifkan Pro</button>
					</div>
				</div>
			</main>
		);
	}

	return (
		<main className="w-screen h-screen bg-[#0f1115] flex flex-col font-sans overflow-hidden">
			<CustomPopup />
			
			{isLinkModalOpen && (
				<div className="absolute inset-0 z-50 flex justify-center items-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
					<div className="bg-[#1a1d24] border border-white/10 p-8 rounded-3xl shadow-2xl w-full max-w-md text-center animate-in zoom-in-95 duration-200">
						<h2 className="text-2xl font-bold text-white mb-2">Link Share Siap!</h2>
						<p className="text-gray-400 text-sm mb-6">Link ini pendek dan anti-gagal.</p>
						
						<div className="relative mb-6">
							<input 
								type="text" 
								readOnly 
								value={isGenerating ? "Memproses data..." : generatedLink} 
								className="w-full bg-black/50 border border-white/10 text-white p-4 rounded-xl text-sm pr-12 focus:outline-none" 
							/>
							{!isGenerating && (
								<button onClick={handleCopyLink} className="absolute right-2 top-1/2 -translate-y-1/2 bg-pink-600 hover:bg-pink-500 text-white p-2 rounded-lg transition-colors">
									{isCopied ? "✅" : "📋"}
								</button>
							)}
						</div>

						<button onClick={() => setIsLinkModalOpen(false)} className="w-full bg-white/10 text-white font-bold py-3 rounded-xl hover:bg-white/20 transition-colors">Tutup</button>
					</div>
				</div>
			)}

			<nav className="w-full h-16 bg-[#1a1d24] border-b border-white/10 flex items-center justify-between px-4 md:px-8 shadow-2xl z-20 shrink-0">
				<div className="flex items-center gap-2 cursor-pointer" onClick={() => setAppState("home")}>
					<div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold shadow-lg">Z</div>
					<span className="font-bold text-white hidden md:block">ZTwibbon Studio</span>
				</div>
				<div className="flex items-center gap-3">
					{isModeratorMode && (
						<button 
							onClick={generateLinkProcess} 
							disabled={!isFormComplete} 
							className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${isFormComplete ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}
						>
							{isUploadingFrame ? "Uploading Frame..." : "🔗 Generate Link"}
						</button>
					)}
					{isPremium ? <span className="bg-pink-500/20 text-pink-400 px-3 py-1 rounded-full text-xs font-bold border border-pink-500/30">👑 PRO</span> : <span className="bg-gray-500/20 text-gray-400 px-3 py-1 rounded-full text-xs font-bold border border-gray-500/30">PESERTA</span>}
				</div>
			</nav>

			<div className="flex-1 flex flex-col md:flex-row overflow-hidden">
				<div className="flex-1 flex flex-col justify-center items-center p-4 md:p-10 relative overflow-y-auto">
					<div className="relative z-10 shadow-[0_0_80px_rgba(0,0,0,0.8)] rounded-2xl overflow-hidden border border-white/10 bg-[#1e1e24] max-h-[60vh] md:max-h-[80vh] aspect-square flex justify-center items-center">
						<TwibbonCanvas userPhoto={userPhoto} frameSrc={activeFrame} transform={photoTransform} setTransform={setPhotoTransform} isEditMode={sidebarState == "adjust"} canvasRef={canvasRef} />
						{!userPhoto && (
							<div className="absolute inset-0 flex justify-center items-center bg-black/40 pointer-events-none">
								<p className="text-white/70 text-sm font-bold bg-black/60 px-6 py-3 rounded-full border border-white/10 backdrop-blur-md animate-pulse">Upload foto lu di panel kanan ⬇️</p>
							</div>
						)}
					</div>
				</div>

				<div className="w-full md:w-[400px] bg-[#1a1d24] border-t md:border-t-0 md:border-l border-white/10 flex flex-col z-10 shadow-2xl h-[50vh] md:h-auto overflow-y-auto shrink-0">
					{isModeratorMode && (
						<div className="p-5 border-b border-white/5 bg-white/[0.02]">
							<h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-pink-500"></span> Pengaturan Event (Pro)</h3>
							<label className="block text-[10px] text-gray-400 uppercase tracking-widest mb-1 font-bold">Judul Twibbon</label>
							<input type="text" value={campaignTitle} onChange={(e) => setCampaignTitle(e.target.value)} placeholder="Isi judul..." className="w-full bg-black/30 border border-white/10 text-white p-3 rounded-xl mb-4 text-sm focus:ring-1 focus:ring-pink-500 outline-none" />
							<label className="block text-[10px] text-gray-400 uppercase tracking-widest mb-1 font-bold">Caption Bawaan</label>
							<input type="text" value={campaignCaption} onChange={(e) => setCampaignCaption(e.target.value)} placeholder="Isi caption..." className="w-full bg-black/30 border border-white/10 text-white p-3 rounded-xl mb-4 text-sm focus:ring-1 focus:ring-pink-500 outline-none" />
							<label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-pink-500/30 rounded-xl cursor-pointer bg-pink-500/5 hover:bg-pink-500/10 transition-colors">
								<div className="flex flex-col items-center justify-center pt-5 pb-6">
									<p className="text-xs text-pink-300 font-semibold">{isUploadingFrame ? "Mengunggah..." : (activeFrame === EMPTY_FRAME ? "Upload Frame PNG" : "Ganti Frame PNG")}</p>
								</div>
								<input type="file" accept="image/png" onChange={handleFrameUpload} className="hidden" disabled={isUploadingFrame} />
							</label>
						</div>
					)}

					{!isModeratorMode && (
						<div className="p-5 border-b border-white/5 bg-white/[0.02]">
							<h3 className="text-lg font-bold text-white mb-1">{campaignTitle}</h3>
							<p className="text-xs text-gray-400">{campaignCaption}</p>
						</div>
					)}
					
					<div className="p-5 flex-1">
						{sidebarState == "landing" && <LandingPageSidebar onPhotoSelected={(img) => { setUserPhoto(img); setSidebarState("adjust"); }} />}
						{sidebarState == "adjust" && <AdjustPageSidebar onPhotoSelected={(img) => { setUserPhoto(img); setSidebarState("adjust"); }} transform={photoTransform} setTransform={setPhotoTransform} onGenerate={setSidebarState} />}
						{sidebarState == "ready" && <DownloadPageSidebar canvas={canvasRef} isPremium={isPremium} />}
					</div>
				</div>
			</div>
		</main>
	);
}

export default App;