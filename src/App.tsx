import { useState, useRef, useEffect } from "react";
import "./App.css";
import TwibbonCanvas from "./components/twibbon-canvas";
import LandingPageSidebar from "./components/landing-page";
import AdjustPageSidebar from "./components/adjust-page";
import DownloadPageSidebar from "./components/download-page";
import { supabase } from "./supabase";
import { Crown, Lock, Link as LinkIcon, AlertCircle, CheckCircle2, Eye, EyeOff, CheckCircle } from "lucide-react";
import { Analytics } from "@vercel/analytics/react";

const EMPTY_FRAME = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

function App() {
	const [appState, setAppState] = useState<"home" | "editor">("home");
	const [isPremium, setIsPremium] = useState(false);
	const [keyInput, setKeyInput] = useState("");
	const [showKey, setShowKey] = useState(false);
	
	const [sidebarState, setSidebarState] = useState<"landing" | "adjust" | "ready">("landing");
	const [userPhoto, setUserPhoto] = useState<HTMLImageElement | null>(null);
	const [photoTransform, setPhotoTransform] = useState({ x: 0, y: 0, scale: 100, rotate: 0 });
	const canvasRef = useRef<HTMLCanvasElement>(null);
	
	const [activeFrame, setActiveFrame] = useState<string>(EMPTY_FRAME);
	const [frameFile, setFrameFile] = useState<File | null>(null);
	
	// State Form (Default Kosong)
	const [campaignTitle, setCampaignTitle] = useState("");
	const [campaignCaption, setCampaignCaption] = useState("");
	const [tempTitle, setTempTitle] = useState("");
	const [tempCaption, setTempCaption] = useState("");
	const [isTitleSet, setIsTitleSet] = useState(false);
	const [isCaptionSet, setIsCaptionSet] = useState(false);

	const [isModeratorMode, setIsModeratorMode] = useState(false);
	const [generatedLink, setGeneratedLink] = useState("");
	const [isGenerating, setIsGenerating] = useState(false);
	const [isCopied, setIsCopied] = useState(false);
	const [isUploadingFrame, setIsUploadingFrame] = useState(false);

	// State Pop-up
	const [popup, setPopup] = useState<{show: boolean, title: string, message: string, type: "error" | "success" | "info"}>({show: false, title: "", message: "", type: "error"});
	const [showMaintenance, setShowMaintenance] = useState(false);
	const [showPngInfo, setShowPngInfo] = useState(false);

	const triggerPopup = (title: string, message: string, type: "error" | "success" | "info" = "error") => {
		setPopup({ show: true, title, message, type });
	};

	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		const campaignId = params.get("id");

		if (campaignId) {
			async function fetchCampaign() {
				const { data } = await supabase.from('campaigns').select('*').eq('id', campaignId).single();
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
			setShowPngInfo(true);
		} else { 
			triggerPopup("Akses Ditolak", "Key Pro yang lu masukin salah.", "error");
		}
	};

	const handleFrameSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		setFrameFile(file);
		const reader = new FileReader();
		reader.onload = (event) => { 
			if (event.target?.result) setActiveFrame(event.target.result as string); 
		};
		reader.readAsDataURL(file);
	};

	const uploadFrameToSupabase = async (): Promise<string | null> => {
		if (!frameFile) return activeFrame;

		setIsUploadingFrame(true);
		const fileExt = frameFile.name.split('.').pop();
		const fileName = `${Date.now()}.${fileExt}`;
		
		const { error: uploadError } = await supabase.storage.from('frames').upload(fileName, frameFile);
		
		if (uploadError) {
			triggerPopup("Gagal Upload", "Gagal upload ke Supabase.", "error");
			setIsUploadingFrame(false);
			return null;
		}

		const { data } = supabase.storage.from('frames').getPublicUrl(fileName);

		const { data: files } = await supabase.storage.from('frames').list();
		if (files) {
			const filesToDelete = files.filter(f => f.name !== fileName && f.name !== '.emptyFolderPlaceholder').map(f => f.name);
			if (filesToDelete.length > 0) {
				await supabase.storage.from('frames').remove(filesToDelete);
			}
		}

		setIsUploadingFrame(false);
		return data.publicUrl;
	};

	const isFormComplete = isTitleSet && isCaptionSet && activeFrame !== EMPTY_FRAME && !isUploadingFrame;

	const generateLinkProcess = async () => {
		if (!isFormComplete) {
			triggerPopup("Belum Lengkap!", "Link tidak dapat dibuat karena belum ngisi frame, judul, atau caption.", "error");
			return;
		}
		
		setIsGenerating(true);
		setGeneratedLink("");

		const uploadedUrl = await uploadFrameToSupabase();
		
		if (!uploadedUrl) {
			setIsGenerating(false);
			return;
		}

		const { data, error } = await supabase.from('campaigns').insert([
			{ title: campaignTitle, caption: campaignCaption, frame_url: uploadedUrl }
		]).select().single();

		if (error) {
			triggerPopup("Gagal", "Gagal menyimpan ke database.", "error");
		} else {
			setGeneratedLink(`${window.location.origin}/?id=${data.id}&pro=${isPremium}`);
			setActiveFrame(uploadedUrl);
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
		const Icon = popup.type === 'error' ? AlertCircle : (popup.type === 'success' ? CheckCircle2 : CheckCircle);
		const color = popup.type === 'error' ? 'text-red-500' : (popup.type === 'success' ? 'text-green-500' : 'text-blue-500');
		const titleColor = popup.type === 'error' ? 'text-red-600' : (popup.type === 'success' ? 'text-green-600' : 'text-blue-600');

		return (
			<div className="fixed inset-0 z-[100] flex justify-center items-center bg-black/70 backdrop-blur-md animate-in fade-in duration-300 p-4">
				<div className="bg-white p-8 rounded-[2rem] shadow-2xl text-center max-w-sm w-full animate-in zoom-in-95 duration-300">
					<div className={`mb-4 flex justify-center ${color} ${popup.type === 'error' ? 'animate-[shake_0.5s_ease-in-out]' : ''}`}>
						<Icon size={64} />
					</div>
					<h2 className={`text-2xl font-black mb-2 tracking-tight ${titleColor}`}>{popup.title}</h2>
					<p className="text-gray-500 font-medium mb-6">{popup.message}</p>
					<button onClick={() => setPopup({ ...popup, show: false })} className="w-full bg-gray-900 text-white font-bold py-3 rounded-xl hover:bg-gray-800 transition-colors active:scale-95">Mengerti</button>
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
						<div className="bg-white p-10 rounded-[2rem] shadow-2xl text-center max-w-sm mx-4">
							<div className="text-6xl mb-6 text-gray-800 flex justify-center"><Lock size={64} /></div>
							<h2 className="text-3xl font-black text-gray-800 mb-3 tracking-tighter">MAINTENANCE</h2>
							<p className="text-gray-500 font-medium mb-8">Versi Free lagi dibenerin. Segera hadir ya!</p>
							<button onClick={() => setShowMaintenance(false)} className="w-full bg-gray-900 text-white font-bold py-4 rounded-xl hover:bg-gray-800 transition-colors active:scale-95">Mengerti</button>
						</div>
					</div>
				)}

				{showPngInfo && (
					<div className="fixed inset-0 z-[90] flex justify-center items-center bg-black/70 backdrop-blur-lg animate-in fade-in zoom-in duration-300">
						<div className="bg-white p-10 rounded-[2rem] shadow-2xl text-center max-w-sm mx-4">
							<div className="text-6xl mb-6 text-pink-500 flex justify-center"><CheckCircle2 size={64} /></div>
							<h2 className="text-2xl font-black text-gray-800 mb-3 tracking-tighter">Berhasil Aktif!</h2>
							<p className="text-gray-500 font-medium mb-8">Pastikan Frame Twibbon yang kamu upload berformat <strong>.PNG (No Background)</strong> ya biar hasilnya maksimal!</p>
							<button onClick={() => { setShowPngInfo(false); setAppState("editor"); }} className="w-full bg-gradient-to-r from-pink-600 to-purple-600 text-white font-bold py-4 rounded-xl hover:scale-105 transition-transform">Mengerti</button>
						</div>
					</div>
				)}

				<div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-pink-600 rounded-full blur-[150px] opacity-20"></div>
				<div className="relative z-10 text-center mb-16 animate-in slide-in-from-top duration-700">
					<h1 className="text-6xl font-extrabold text-white mb-6 tracking-tight drop-shadow-2xl">ZTwibbon <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400">PRO</span></h1>
					<p className="text-gray-400 text-lg">Bikin twibbon keren tanpa watermark.</p>
				</div>

				<div className="relative z-10 flex flex-col md:flex-row gap-8 w-full max-w-4xl px-6">
					<div onClick={() => setShowMaintenance(true)} className="flex-1 bg-gradient-to-b from-gray-500/10 to-gray-500/5 backdrop-blur-xl border border-gray-500/30 p-10 rounded-[2rem] shadow-[0_0_40px_rgba(156,163,175,0.15)] text-center transition-all duration-500 hover:scale-105 group relative z-20 cursor-pointer grayscale opacity-50">
						<div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-gray-600 to-gray-400 text-white text-xs font-bold px-6 py-1.5 rounded-full shadow-lg tracking-widest">COMING SOON</div>
						<div className="mb-6 flex justify-center text-gray-400"><Lock size={48} /></div>
						<h2 className="text-3xl font-bold text-gray-400 mb-3">Versi Free</h2>
					</div>

					<div className="flex-1 bg-gradient-to-b from-pink-500/10 to-purple-500/5 backdrop-blur-xl border border-pink-500/30 p-10 rounded-[2rem] shadow-[0_0_40px_rgba(236,72,153,0.15)] text-center transition-all duration-500 hover:scale-105 hover:-translate-y-2 hover:shadow-[0_0_80px_rgba(236,72,153,0.6)] group relative z-20">
						<div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-pink-500 to-purple-500 text-white text-xs font-bold px-6 py-1.5 rounded-full shadow-lg tracking-widest">PALING LARIS</div>
						<div className="mb-6 flex justify-center text-yellow-400"><Crown size={56} /></div>
						<h2 className="text-3xl font-bold text-white mb-3">Versi PRO</h2>
						
						<div className="relative w-full mb-4">
							<input 
								type={showKey ? "text" : "password"} 
								value={keyInput} 
								onChange={(e) => setKeyInput(e.target.value)} 
								className="w-full bg-black/40 border border-white/10 p-4 pr-12 rounded-xl text-center text-white text-sm focus:outline-none focus:border-pink-500 transition-all placeholder-gray-500" 
								placeholder="Masukin Key PRO" 
							/>
							<button onClick={() => setShowKey(!showKey)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors">
								{showKey ? <EyeOff size={18} /> : <Eye size={18} />}
							</button>
						</div>
						
						<button onClick={handleClaimPremium} className="w-full bg-gradient-to-r from-pink-600 to-purple-600 text-white font-bold py-4 rounded-xl shadow-[0_10px_20px_rgba(236,72,153,0.3)] hover:shadow-[0_10px_40px_rgba(236,72,153,0.8)] transition-all uppercase tracking-wider">Aktifkan</button>
					</div>
				</div>
				<Analytics />
			</main>
		);
	}

	return (
		<main className="w-screen h-screen bg-[#0f1115] flex flex-col font-sans overflow-hidden">
			<CustomPopup />

			<nav className="w-full h-16 bg-[#1a1d24] border-b border-white/10 flex items-center justify-between px-4 md:px-8 shadow-2xl z-20 shrink-0">
				<div className="flex items-center gap-2 cursor-pointer" onClick={() => setAppState("home")}>
					<div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold shadow-lg">Z</div>
					<span className="font-bold text-white hidden md:block">ZTwibbon PRO</span>
				</div>
				<div className="flex items-center gap-3">
					{isPremium ? <span className="bg-pink-500/20 text-pink-400 px-3 py-1 rounded-full text-xs font-bold border border-pink-500/30 flex items-center gap-1"><Crown size={12}/> PRO</span> : <span className="bg-gray-500/20 text-gray-400 px-3 py-1 rounded-full text-xs font-bold border border-gray-500/30">PESERTA</span>}
				</div>
			</nav>

			<div className="flex-1 flex flex-col md:flex-row overflow-hidden">
				<div className="flex-1 flex flex-col justify-center items-center p-4 md:p-10 relative overflow-y-auto">
					<div className="relative z-10 max-h-[60vh] md:max-h-[80vh] aspect-square flex justify-center items-center">
						<TwibbonCanvas userPhoto={userPhoto} frameSrc={activeFrame} transform={photoTransform} setTransform={setPhotoTransform} isEditMode={sidebarState == "adjust"} canvasRef={canvasRef} />
						{!userPhoto && (
							<div className="absolute inset-0 flex justify-center items-center bg-black/40 pointer-events-none rounded-xl">
								<p className="text-white/70 text-sm font-bold bg-black/60 px-6 py-3 rounded-full border border-white/10 backdrop-blur-md animate-pulse">Upload foto lu di panel kanan ⬇️</p>
							</div>
						)}
					</div>
				</div>

				<div className="w-full md:w-[400px] bg-[#1a1d24] border-t md:border-t-0 md:border-l border-white/10 flex flex-col z-10 shadow-2xl h-[50vh] md:h-auto overflow-y-auto shrink-0">
					{isModeratorMode && (
						<div className="p-5 border-b border-white/5 bg-white/[0.02]">
							<h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-pink-500"></div> Pengaturan Event</h3>
							
							<label className="block text-[10px] text-gray-400 uppercase tracking-widest mb-1 font-bold">Judul Event</label>
							{isTitleSet ? (
								<div className="flex justify-between items-center bg-black/30 border border-white/10 p-3 rounded-xl mb-4 text-sm text-white">
									<span className="truncate">{campaignTitle}</span>
									<button onClick={() => setIsTitleSet(false)} className="text-xs text-pink-400 font-bold hover:text-pink-300 ml-2">Edit</button>
								</div>
							) : (
								<div className="flex gap-2 mb-4">
									<input type="text" value={tempTitle} onChange={(e) => setTempTitle(e.target.value)} placeholder="Isi Judul Event" className="w-full bg-black/30 border border-white/10 text-white p-3 rounded-xl text-sm focus:ring-1 focus:ring-pink-500 outline-none" />
									<button onClick={() => { if(tempTitle) { setCampaignTitle(tempTitle); setIsTitleSet(true); } }} className="bg-pink-600 px-4 rounded-xl text-white font-bold text-xs hover:bg-pink-500 transition-colors">Set</button>
								</div>
							)}
							
							<label className="block text-[10px] text-gray-400 uppercase tracking-widest mb-1 font-bold">Caption Bawaan</label>
							{isCaptionSet ? (
								<div className="flex justify-between items-center bg-black/30 border border-white/10 p-3 rounded-xl mb-4 text-sm text-white">
									<span className="truncate">{campaignCaption}</span>
									<button onClick={() => setIsCaptionSet(false)} className="text-xs text-pink-400 font-bold hover:text-pink-300 ml-2">Edit</button>
								</div>
							) : (
								<div className="flex gap-2 mb-4">
									<input type="text" value={tempCaption} onChange={(e) => setTempCaption(e.target.value)} placeholder="Isi Caption" className="w-full bg-black/30 border border-white/10 text-white p-3 rounded-xl text-sm focus:ring-1 focus:ring-pink-500 outline-none" />
									<button onClick={() => { if(tempCaption) { setCampaignCaption(tempCaption); setIsCaptionSet(true); } }} className="bg-pink-600 px-4 rounded-xl text-white font-bold text-xs hover:bg-pink-500 transition-colors">Set</button>
								</div>
							)}
							
							<label className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed border-pink-500/30 rounded-xl cursor-pointer bg-pink-500/5 hover:bg-pink-500/10 transition-colors mb-4 mt-2">
								<div className="flex flex-col items-center justify-center">
									<p className="text-xs text-pink-300 font-semibold">{isUploadingFrame ? "Mengunggah..." : (activeFrame === EMPTY_FRAME ? "Upload Frame PNG" : "Ganti Frame PNG")}</p>
								</div>
								<input type="file" accept="image/png" onChange={handleFrameSelect} className="hidden" disabled={isUploadingFrame} />
							</label>

							<button 
								onClick={generateLinkProcess} 
								disabled={isGenerating} 
								className={`w-full py-3 rounded-xl text-xs font-bold transition-all flex justify-center items-center gap-2 ${isFormComplete ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}
							>
								<LinkIcon size={14} />
								{isGenerating ? "Memproses Link & Upload..." : "Generate Link"}
							</button>

							{generatedLink && (
								<div className="mt-4 p-3 bg-black/40 border border-white/10 rounded-xl">
									<p className="text-[10px] text-gray-400 mb-2 font-bold uppercase tracking-widest">Link Siap Dibagikan:</p>
									<div className="flex gap-2">
										<input type="text" readOnly value={generatedLink} className="w-full bg-transparent text-xs text-white outline-none" />
										<button onClick={handleCopyLink} className="bg-pink-600 p-2 rounded-lg text-white hover:bg-pink-500 transition-colors">
											{isCopied ? <CheckCircle2 size={14} /> : <LinkIcon size={14} />}
										</button>
									</div>
								</div>
							)}
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
						{sidebarState === "ready" && <DownloadPageSidebar canvas={canvasRef} isPremium={isPremium} initialCaption={campaignCaption} />}
					</div>
				</div>
			</div>
			<Analytics />
		</main>
	);
}

export default App;