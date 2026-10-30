import { useState, useRef, useEffect } from "react";
import "./App.css";
import TwibbonCanvas from "./components/twibbon-canvas";
import LandingPageSidebar from "./components/landing-page";
import AdjustPageSidebar from "./components/adjust-page";
import DownloadPageSidebar from "./components/download-page";
import { supabase } from "./supabase";
import { Crown, Lock, Link as LinkIcon, AlertCircle, CheckCircle2, Eye, EyeOff, CheckCircle, Clock, ShieldAlert, Key, Plus, Trash2, Power, LogOut, MonitorSmartphone, Loader2, RotateCcw, RefreshCcw } from "lucide-react";
import { Analytics } from "@vercel/analytics/react";

const EMPTY_FRAME = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
const ADMIN_PASSWORD = "ADMINZTWIBBON";

function App() {
	const [appState, setAppState] = useState<"home" | "editor">("home");
	const [isPremium, setIsPremium] = useState(false);
	const [keyInput, setKeyInput] = useState("");
	const [showKey, setShowKey] = useState(false);
	const [timeLeft, setTimeLeft] = useState<string | null>(null);
	const [isLoadingLogin, setIsLoadingLogin] = useState(false);

	const [sidebarState, setSidebarState] = useState<"landing" | "adjust" | "ready">("landing");
	const [userPhoto, setUserPhoto] = useState<HTMLImageElement | null>(null);
	const [photoTransform, setPhotoTransform] = useState({ x: 0, y: 0, scale: 100, rotate: 0 });
	const canvasRef = useRef<HTMLCanvasElement>(null);
	
	const [activeFrame, setActiveFrame] = useState<string>(EMPTY_FRAME);
	const [frameFile, setFrameFile] = useState<File | null>(null);
	
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

	const [popup, setPopup] = useState<{show: boolean, title: string, message: string, type: "error" | "success" | "info" | "confirm", showBar?: boolean, onConfirm?: () => void}>({show: false, title: "", message: "", type: "error"});
	const [showMaintenance, setShowMaintenance] = useState(false);
	const [showPngInfo, setShowPngInfo] = useState(false);

	const [isAdminMode, setIsAdminMode] = useState(false);
	const [adminPass, setAdminPass] = useState("");
	const [isAdminLogged, setIsAdminLogged] = useState(false);
	const [allKeys, setAllKeys] = useState<any[]>([]);
	const [newKeyName, setNewKeyName] = useState("");
	const [newKeyDuration, setNewKeyDuration] = useState("24");
	const [newKeyMaxDevices, setNewKeyMaxDevices] = useState("1");

	const triggerPopup = (title: string, message: string, type: "error" | "success" | "info" | "confirm" = "error", showBar = false, onConfirm?: () => void) => {
		setPopup({ show: true, title, message, type, showBar, onConfirm });
	};

	const getDeviceId = () => {
		let id = localStorage.getItem("ztwibbon_deviceid");
		if (!id) {
			id = Math.random().toString(36).substring(2, 15);
			localStorage.setItem("ztwibbon_deviceid", id);
		}
		return id;
	};

	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		if (params.get("admin") === "true") setIsAdminMode(true);

		const savedExpiry = localStorage.getItem("ztwibbon_expiry");
		if (savedExpiry) {
			if (Date.now() < parseInt(savedExpiry)) { setIsPremium(true); setIsModeratorMode(true); }
			else { localStorage.removeItem("ztwibbon_expiry"); setIsPremium(false); setIsModeratorMode(false); }
		}

		try {
			const savedDesign = localStorage.getItem("ztwibbon_saved_frame");
			if (savedDesign && savedDesign !== EMPTY_FRAME) setActiveFrame(savedDesign);
			const savedTitle = localStorage.getItem("ztwibbon_saved_title");
			if (savedTitle) { setCampaignTitle(savedTitle); setIsTitleSet(true); }
			const savedCaption = localStorage.getItem("ztwibbon_saved_caption");
			if (savedCaption) { setCampaignCaption(savedCaption); setIsCaptionSet(true); }
		} catch (e) {}

		const campaignId = params.get("id");
		if (campaignId && !isAdminMode) {
			async function fetchCampaign() {
				const { data } = await supabase.from('campaigns').select('*').eq('id', campaignId).single();
				if (data) {
					setCampaignTitle(data.title); setCampaignCaption(data.caption); setActiveFrame(data.frame_url);
					setAppState("editor"); 
					setIsModeratorMode(false); 
					if (params.get("pro") === "true") setIsPremium(true);
				}
			}
			fetchCampaign();
		}
	}, [isAdminMode]);

	useEffect(() => {
		if (!isPremium || !isModeratorMode) return;
		const savedExpiry = localStorage.getItem("ztwibbon_expiry");
		if (!savedExpiry) return;
		const interval = setInterval(() => {
			const diff = parseInt(savedExpiry) - Date.now();
			if (diff <= 0) { clearInterval(interval); handleLogout(); return; }
			const hours = Math.floor(diff / 3600000);
			const minutes = Math.floor((diff % 3600000) / 60000);
			const seconds = Math.floor((diff % 60000) / 1000);
			setTimeLeft(`${hours}j ${minutes}m ${seconds}s`);
		}, 1000);
		return () => clearInterval(interval);
	}, [isPremium, isModeratorMode]);

	const handleLogout = () => {
		localStorage.removeItem("ztwibbon_expiry");
		setIsPremium(false); setIsModeratorMode(false); setTimeLeft(null);
		setAppState("home");
		triggerPopup("Logout", "Sesi PRO lu udah berakhir.", "info");
	};

	const handleResetDesign = () => {
		triggerPopup(
			"Reset Event?", 
			"Semua Judul, Caption, dan Frame bakal dihapus permanen dari layar. Kuota device lu tetep aman.", 
			"confirm",
			false,
			() => {
				localStorage.removeItem("ztwibbon_saved_frame");
				localStorage.removeItem("ztwibbon_saved_title");
				localStorage.removeItem("ztwibbon_saved_caption");
				
				setActiveFrame(EMPTY_FRAME); 
				setCampaignTitle(""); setCampaignCaption("");
				setIsTitleSet(false); setIsCaptionSet(false);
				setTempTitle(""); setTempCaption(""); 
				setSidebarState("landing"); 
				setUserPhoto(null); 
				setFrameFile(null);
				setGeneratedLink(""); 
				
				triggerPopup("Reset Berhasil", "Desain, judul, caption, dan link udah dihapus.", "success", true);
			}
		);
	};

	const handleResetPhoto = () => {
		setSidebarState("landing");
		setUserPhoto(null);
		setFrameFile(null);
	};

	useEffect(() => {
		try {
			if (activeFrame && activeFrame !== EMPTY_FRAME && activeFrame.length < 2000000) {
				localStorage.setItem("ztwibbon_saved_frame", activeFrame);
			}
			if (campaignTitle) localStorage.setItem("ztwibbon_saved_title", campaignTitle);
			if (campaignCaption) localStorage.setItem("ztwibbon_saved_caption", campaignCaption);
		} catch (error) {}
	}, [activeFrame, campaignTitle, campaignCaption]);

	const fetchAllKeys = async () => {
		const { data } = await supabase.from('license_keys').select('*').order('created_at', { ascending: false });
		if (data) setAllKeys(data);
	};
	useEffect(() => { if (isAdminLogged) fetchAllKeys(); }, [isAdminLogged]);
	const handleAdminLogin = () => {
		if (adminPass === ADMIN_PASSWORD) setIsAdminLogged(true);
		else triggerPopup("Gagal", "Password Admin salah!", "error");
	};
	const handleGenerateKey = async () => {
		if (!newKeyName || !newKeyDuration) return;
		const dur = parseFloat(newKeyDuration);
		const maxDev = parseInt(newKeyMaxDevices);
		const { error } = await supabase.from('license_keys').insert([{ key_code: newKeyName, duration_hours: dur, max_devices: maxDev, used_devices: [] }]);
		if (error) {
			if (error.code === '23505') triggerPopup("Key Duplikat", "Nama key ini udah ada.", "error");
			else triggerPopup("Error", "Gagal simpan key.", "error");
		} else {
			triggerPopup("Sukses", "Key baru berhasil dibuat!", "success");
			setNewKeyName(""); setNewKeyDuration("24"); setNewKeyMaxDevices("1");
			fetchAllKeys();
		}
	};
	const handleToggleKey = async (id: string, currentStatus: boolean) => {
		await supabase.from('license_keys').update({ is_active: !currentStatus }).eq('id', id);
		fetchAllKeys();
	};
	const handleDeleteKey = async (id: string) => {
		if(confirm("Hapus key ini permanen?")) {
			await supabase.from('license_keys').delete().eq('id', id);
			fetchAllKeys();
		}
	};

	const handleClaimPremium = async () => {
		if (!keyInput) return;
		setIsLoadingLogin(true);
		const { data, error } = await supabase.from('license_keys').select('*').eq('key_code', keyInput).single();
		if (error || !data) { setIsLoadingLogin(false); triggerPopup("Akses Ditolak", "Key Pro tidak ditemukan.", "error"); return; } 
		if (!data.is_active) { setIsLoadingLogin(false); triggerPopup("Key Mati", "Key ini udah dinonaktifin sama Admin.", "error"); return; }
		const deviceId = getDeviceId();
		let currentDevices = data.used_devices || [];
		let activationTime = data.activation_time || 0;
		if (currentDevices.includes(deviceId)) {
			const timePassedMs = Date.now() - activationTime;
			const durationMs = data.duration_hours * 3600000;
			if (timePassedMs >= durationMs) { setIsLoadingLogin(false); triggerPopup("Key Expired", "Waktu key ini udah habis. Silakan beli key baru.", "error"); return; }
		} else {
			if (currentDevices.length >= data.max_devices) { setIsLoadingLogin(false); triggerPopup("Batas Device", `Key ini udah dipake di ${data.max_devices} device lain.`, "error"); return; }
			currentDevices.push(deviceId);
			activationTime = Date.now();
			await supabase.from('license_keys').update({ used_devices: currentDevices, activation_time: activationTime }).eq('id', data.id);
		}
		setTimeout(() => {
			const durationMs = data.duration_hours * 3600000;
			localStorage.setItem("ztwibbon_expiry", (activationTime + durationMs).toString());
			setIsPremium(true); setIsModeratorMode(true); setAppState("editor"); setShowPngInfo(true); setIsLoadingLogin(false);
		}, 1000);
	};

	const handleFrameSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0]; if (!file) return;
		setFrameFile(file);
		const reader = new FileReader();
		reader.onload = (event) => { if (event.target?.result) setActiveFrame(event.target.result as string); };
		reader.readAsDataURL(file);
	};

	const uploadFrameToSupabase = async (): Promise<string | null> => {
		if (!frameFile) return activeFrame;
		setIsUploadingFrame(true);
		const fileExt = frameFile.name.split('.').pop();
		const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
		const { error } = await supabase.storage.from('frames').upload(fileName, frameFile);
		if (error) { setIsUploadingFrame(false); return null; }
		const { data } = supabase.storage.from('frames').getPublicUrl(fileName);
		const { data: files } = await supabase.storage.from('frames').list();
		if (files) {
			const filesToDelete = files.filter(f => f.name !== fileName && f.name !== '.emptyFolderPlaceholder').map(f => f.name);
			if (filesToDelete.length > 0) await supabase.storage.from('frames').remove(filesToDelete);
		}
		setIsUploadingFrame(false);
		return data.publicUrl;
	};

	const isFormComplete = isTitleSet && isCaptionSet && activeFrame !== EMPTY_FRAME && !isUploadingFrame;

	const generateLinkProcess = async () => {
		if (!isFormComplete) { triggerPopup("Belum Lengkap!", "Isi judul, caption, dan frame dulu.", "error"); return; }
		setIsGenerating(true);
		const uploadedUrl = await uploadFrameToSupabase();
		if (!uploadedUrl) { setIsGenerating(false); return; }
		const { data, error } = await supabase.from('campaigns').insert([{ title: campaignTitle, caption: campaignCaption, frame_url: uploadedUrl }]).select().single();
		if (!error) { setGeneratedLink(`${window.location.origin}/?id=${data.id}&pro=${isPremium}`); setActiveFrame(uploadedUrl); }
		setIsGenerating(false);
	};

	const handleCopyLink = () => { navigator.clipboard.writeText(generatedLink); setIsCopied(true); setTimeout(() => setIsCopied(false), 3000); };

	const CustomPopup = () => {
		if (!popup.show) return null;
		const Icon = popup.type === 'error' ? AlertCircle : (popup.type === 'success' ? CheckCircle2 : CheckCircle);
		const color = popup.type === 'error' ? 'text-red-500' : (popup.type === 'success' ? 'text-green-500' : 'text-blue-500');

		if (popup.type === 'confirm') {
			return (
				<div className="fixed inset-0 z-[100] flex justify-center items-center bg-black/70 p-4 animate-in fade-in duration-200">
					<div className="bg-white p-8 rounded-[2rem] shadow-2xl text-center max-w-sm w-full animate-in zoom-in-95 duration-200">
						<div className="mb-4 flex justify-center text-orange-500"><RefreshCcw size={64} /></div>
						<h2 className="text-2xl font-black mb-2 text-gray-800">{popup.title}</h2>
						<p className="text-gray-500 font-medium mb-6">{popup.message}</p>
						<div className="flex gap-2">
							<button onClick={() => setPopup({ ...popup, show: false })} className="flex-1 bg-gray-200 text-gray-800 font-bold py-3 rounded-xl hover:bg-gray-300 transition-colors">Batal</button>
							<button onClick={() => { setPopup({ ...popup, show: false }); popup.onConfirm?.(); }} className="flex-1 bg-red-500 text-white font-bold py-3 rounded-xl hover:bg-red-600 transition-colors">Ya, Reset</button>
						</div>
					</div>
				</div>
			);
		}

		return (
			<div className="fixed inset-0 z-[100] flex justify-center items-center bg-black/70 p-4 animate-in fade-in duration-200">
				<div className="bg-white p-8 rounded-[2rem] shadow-2xl text-center max-w-sm w-full relative overflow-hidden animate-in zoom-in-95 duration-200">
					<div className={`mb-4 flex justify-center ${color}`}><Icon size={64} /></div>
					<h2 className={`text-2xl font-black mb-2 ${color}`}>{popup.title}</h2>
					<p className="text-gray-500 font-medium mb-6">{popup.message}</p>
					
					{popup.showBar && (
						<div className="w-full bg-gray-200 h-1.5 rounded-full mb-6 overflow-hidden">
							<div className="bg-green-500 h-full w-full origin-left animate-[shrink_2s_ease-out_forwards]"></div>
						</div>
					)}
					
					<button onClick={() => setPopup({ ...popup, show: false })} className="w-full bg-gray-900 text-white font-bold py-3 rounded-xl hover:bg-gray-800 transition-colors">Mengerti</button>
				</div>
			</div>
		);
	};
	if (isAdminMode) {
		if (!isAdminLogged) {
			return (
				<main className="w-screen h-screen flex flex-col justify-center items-center bg-[#0f172a] p-4">
					<CustomPopup />
					<div className="bg-[#1a1d24] p-8 rounded-3xl border border-white/10 shadow-2xl text-center w-full max-w-sm relative z-10">
						<ShieldAlert size={48} className="mx-auto text-pink-500 mb-4" />
						<h2 className="text-2xl font-bold text-white mb-6">Admin Login</h2>
						<input type="password" value={adminPass} onChange={(e) => setAdminPass(e.target.value)} placeholder="Password Admin" className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-white mb-4 text-center focus:border-pink-500 outline-none" />
						<button onClick={handleAdminLogin} className="w-full bg-gradient-to-r from-pink-600 to-purple-600 text-white font-bold py-3 rounded-xl">Masuk</button>
					</div>
				</main>
			);
		}

		return (
			<main className="w-screen min-h-screen bg-[#0f172a] p-4 md:p-10 font-sans">
				<CustomPopup />
				<div className="max-w-6xl mx-auto">
					<div className="flex justify-between items-center mb-8">
						<h1 className="text-3xl font-bold text-white flex items-center gap-2"><Key className="text-pink-500"/> License Manager</h1>
						<button onClick={() => setIsAdminMode(false)} className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm border border-white/10">Ke Web Utama</button>
					</div>

					<div className="bg-[#1a1d24] p-6 rounded-2xl border border-white/10 mb-8 flex flex-col md:flex-row gap-4 items-end shadow-2xl">
						<div className="flex-1 w-full">
							<label className="text-xs text-gray-400 font-bold mb-2 block">Nama Key Baru</label>
							<input type="text" value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} placeholder="PROMO-10K" className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-white focus:border-pink-500 outline-none" />
						</div>
						<div className="w-full md:w-32">
							<label className="text-xs text-gray-400 font-bold mb-2 block">Durasi (Jam)</label>
							<input type="number" value={newKeyDuration} onChange={(e) => setNewKeyDuration(e.target.value)} placeholder="24" className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-white focus:border-pink-500 outline-none" />
						</div>
						<div className="w-full md:w-32">
							<label className="text-xs text-gray-400 font-bold mb-2 block">Max Device</label>
							<input type="number" value={newKeyMaxDevices} onChange={(e) => setNewKeyMaxDevices(e.target.value)} placeholder="1" className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-white focus:border-pink-500 outline-none" />
						</div>
						<button onClick={handleGenerateKey} className="w-full md:w-auto bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 shadow-lg"><Plus size={18}/> Generate</button>
					</div>

					<div className="bg-[#1a1d24] rounded-2xl border border-white/10 overflow-x-auto shadow-2xl">
						<table className="w-full text-left text-white min-w-[700px]">
							<thead className="bg-white/5 border-b border-white/10">
								<tr>
									<th className="p-4 font-bold text-sm">Key</th>
									<th className="p-4 font-bold text-sm">Durasi</th>
									<th className="p-4 font-bold text-sm">Device</th>
									<th className="p-4 font-bold text-sm">Status</th>
									<th className="p-4 font-bold text-sm text-right">Aksi</th>
								</tr>
							</thead>
							<tbody>
								{allKeys.map(k => (
									<tr key={k.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
										<td className="p-4 font-mono">{k.key_code}</td>
										<td className="p-4 text-sm text-gray-400">{k.duration_hours} Jam</td>
										<td className="p-4 text-sm text-gray-400 flex items-center gap-1"><MonitorSmartphone size={14}/> {k.used_devices?.length || 0} / {k.max_devices}</td>
										<td className="p-4">
											<span className={`px-3 py-1 rounded-full text-xs font-bold ${k.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
												{k.is_active ? "AKTIF" : "MATI"}
											</span>
										</td>
										<td className="p-4 flex justify-end gap-2">
											<button onClick={() => handleToggleKey(k.id, k.is_active)} className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg"><Power size={16}/></button>
											<button onClick={() => handleDeleteKey(k.id)} className="p-2 bg-red-500/20 text-red-400 hover:bg-red-500/40 rounded-lg"><Trash2 size={16}/></button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			</main>
		);
	}

	if (appState === "home") {
		return (
			<main className="w-screen h-screen flex flex-col justify-center items-center bg-[#0f172a] relative overflow-hidden font-sans">
				<CustomPopup />
				{showMaintenance && (
					<div className="fixed inset-0 z-[90] flex justify-center items-center bg-black/80 p-4 animate-in fade-in zoom-in-95 duration-300">
						<div className="bg-white p-10 rounded-[2rem] text-center max-w-sm mx-4">
							<Lock size={64} className="mx-auto text-gray-800 mb-4 animate-bounce" />
							<h2 className="text-3xl font-black text-gray-800 mb-3">MAINTENANCE</h2>
							<p className="text-gray-500 mb-6">Versi Free lagi dibenerin. Segera hadir ya!</p>
							<button onClick={() => setShowMaintenance(false)} className="w-full bg-gray-900 text-white font-bold py-4 rounded-xl">Mengerti</button>
						</div>
					</div>
				)}
				{showPngInfo && (
					<div className="fixed inset-0 z-[90] flex justify-center items-center bg-black/80 p-4 animate-in fade-in zoom-in-95 duration-300">
						<div className="bg-white p-10 rounded-[2rem] text-center max-w-sm mx-4">
							<CheckCircle2 size={64} className="mx-auto text-pink-500 mb-4 animate-bounce" />
							<h2 className="text-2xl font-black text-gray-800 mb-3">Berhasil!</h2>
							<p className="text-gray-500 mb-6">Pastikan Frame Twibbon yang kamu upload berformat <strong>.PNG (No Background)</strong> ya!</p>
							<button onClick={() => { setShowPngInfo(false); setAppState("editor"); window.location.reload(); }} className="w-full bg-pink-600 text-white font-bold py-4 rounded-xl">Mengerti</button>
						</div>
					</div>
				)}
				
				<div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-pink-600 rounded-full blur-[150px] opacity-20 pointer-events-none"></div>
				<div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600 rounded-full blur-[150px] opacity-20 pointer-events-none"></div>
				
				<div className="relative z-10 text-center mb-16">
					<h1 className="text-6xl font-extrabold text-white mb-6 drop-shadow-2xl">ZTwibbon <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400">PRO</span></h1>
					<p className="text-gray-400 text-lg">Bikin twibbon keren tanpa watermark.</p>
				</div>
				
				<div className="relative z-10 flex flex-col md:flex-row gap-8 w-full max-w-4xl px-6">
					<div onClick={() => setShowMaintenance(true)} className="flex-1 bg-gradient-to-b from-gray-500/10 to-gray-500/5 backdrop-blur-xl border border-gray-500/30 p-10 rounded-[2rem] shadow-xl text-center transition-all duration-300 hover:scale-105 hover:-translate-y-2 hover:border-gray-400 group relative z-20 cursor-pointer grayscale opacity-50">
						<div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-gray-600 to-gray-400 text-white text-xs font-bold px-6 py-1.5 rounded-full tracking-widest">COMING SOON</div>
						<div className="mb-6 flex justify-center text-gray-400"><Lock size={48} /></div>
						<h2 className="text-3xl font-bold text-gray-400 mb-3">Versi Free</h2>
					</div>

					<div className="flex-1 bg-gradient-to-b from-pink-500/10 to-purple-500/5 backdrop-blur-xl border border-pink-500/30 p-10 rounded-[2rem] shadow-xl text-center transition-all duration-300 hover:scale-105 hover:-translate-y-2 hover:shadow-[0_0_40px_rgba(236,72,153,0.5)] hover:border-pink-400 group relative z-20">
						<div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-pink-500 to-purple-500 text-white text-xs font-bold px-6 py-1.5 rounded-full tracking-widest">PALING LARIS</div>
						<div className="mb-6 flex justify-center text-yellow-400"><Crown size={56} /></div>
						<h2 className="text-3xl font-bold text-white mb-3">Versi PRO</h2>
						
						{isPremium && timeLeft ? (
							<div className="mb-4 space-y-3">
								<div className="bg-green-500/10 border border-green-500/30 p-2 rounded-xl flex items-center justify-center gap-2 text-green-400 font-bold text-sm"><Clock size={14}/> Aktif: {timeLeft}</div>
								<button onClick={() => setAppState("editor")} className="w-full flex items-center justify-center gap-2 bg-pink-600 text-white py-3 rounded-xl font-bold hover:bg-pink-500 transition-all">Masuk ke Editor</button>
							</div>
						) : (
							<>
								<div className="relative w-full mb-4">
									<input type={showKey ? "text" : "password"} value={keyInput} onChange={(e) => setKeyInput(e.target.value)} className="w-full bg-black/40 border border-white/10 p-4 pr-12 rounded-xl text-center text-white focus:border-pink-500 outline-none placeholder-gray-500" placeholder="Masukin Key PRO" disabled={isLoadingLogin} />
									<button onClick={() => setShowKey(!showKey)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">{showKey ? <EyeOff size={18}/> : <Eye size={18}/>}</button>
								</div>
								<button onClick={handleClaimPremium} disabled={isLoadingLogin} className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-pink-600 to-purple-600 text-white font-bold py-4 rounded-xl shadow-lg transition-transform active:scale-95">
									{isLoadingLogin ? <><Loader2 className="animate-spin" size={20} /> Memproses...</> : "Aktifkan"}
								</button>
							</>
						)}
					</div>
				</div>
				<Analytics />
			</main>
		);
	}

	return (
		<main className="w-screen h-screen bg-[#0f1115] flex flex-col font-sans overflow-hidden">
			<CustomPopup />

			{showPngInfo && (
				<div className="fixed inset-0 z-[90] flex justify-center items-center bg-black/80 p-4 animate-in fade-in zoom-in-95 duration-300">
					<div className="bg-white p-10 rounded-[2rem] text-center max-w-sm mx-4">
						<CheckCircle2 size={64} className="mx-auto text-pink-500 mb-4 animate-bounce" />
						<h2 className="text-2xl font-black text-gray-800 mb-3">Berhasil Aktif!</h2>
						<p className="text-gray-500 mb-6">Pastikan Frame Twibbon yang kamu upload berformat <strong>.PNG (No Background)</strong> ya biar hasilnya maksimal!</p>
						<button onClick={() => setShowPngInfo(false)} className="w-full bg-pink-600 text-white font-bold py-4 rounded-xl">Mengerti</button>
					</div>
				</div>
			)}

			<nav className="w-full h-16 bg-[#1a1d24] border-b border-white/10 flex items-center justify-between px-4 md:px-8 z-20 shrink-0">
				{/* LOGO CUMA BISA DIKLIK KALO MODERATOR */}
				<div 
					className={`flex items-center gap-2 ${isModeratorMode ? "cursor-pointer" : ""}`} 
					onClick={() => isModeratorMode && setAppState("home")}
				>
					<div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold">Z</div>
					<span className="font-bold text-white hidden md:block">ZTwibbon PRO</span>
				</div>
				<div className="flex items-center gap-3">
					{isPremium && timeLeft && isModeratorMode && <span className="text-xs font-bold text-green-400 flex items-center gap-1"><Clock size={12}/> {timeLeft}</span>}
					{isPremium ? <span className="bg-pink-500/20 text-pink-400 px-3 py-1 rounded-full text-xs font-bold border border-pink-500/30 flex items-center gap-1"><Crown size={12}/> PRO</span> : <span className="bg-gray-500/20 text-gray-400 px-3 py-1 rounded-full text-xs font-bold border border-gray-500/30">PESERTA</span>}
					
					{isPremium && isModeratorMode && (
						<button onClick={handleLogout} className="text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-1 rounded-lg hover:bg-red-500/20 transition-colors flex items-center gap-1">
							<LogOut size={12}/> Logout
						</button>
					)}
				</div>
			</nav>
			<div className="flex-1 flex flex-col md:flex-row overflow-hidden">
				<div className="flex-1 flex flex-col justify-center items-center p-4 md:p-10 relative overflow-y-auto">
					<div className="relative z-10 max-h-[60vh] md:max-h-[80vh] aspect-square flex justify-center items-center">
						<TwibbonCanvas userPhoto={userPhoto} frameSrc={activeFrame} transform={photoTransform} setTransform={setPhotoTransform} isEditMode={sidebarState == "adjust"} canvasRef={canvasRef} />
						{!userPhoto && <div className="absolute inset-0 flex justify-center items-center bg-black/40 rounded-xl pointer-events-none"><p className="text-white/70 text-sm font-bold bg-black/60 px-6 py-3 rounded-full animate-pulse">Upload foto lu di panel kanan ⬇️</p></div>}
					</div>
				</div>
				<div className="w-full md:w-[400px] bg-[#1a1d24] border-t md:border-t-0 md:border-l border-white/10 flex flex-col z-10 shadow-2xl h-[50vh] md:h-auto overflow-y-auto shrink-0">
					{isModeratorMode && (
						<div className="p-5 border-b border-white/5 bg-white/[0.02]">
							<div className="flex justify-between items-center mb-4">
								<h3 className="text-sm font-bold text-white">Pengaturan Event</h3>
								<button onClick={handleResetDesign} className="text-[10px] font-bold text-gray-400 hover:text-red-400 flex items-center gap-1 transition-colors">
									<RotateCcw size={12}/> Reset Event
								</button>
							</div>
							
							<label className="block text-[10px] text-gray-400 uppercase mb-1">Judul Event</label>
							{isTitleSet ? <div className="flex justify-between bg-black/30 p-3 rounded-xl mb-4 text-sm text-white">{campaignTitle} <button onClick={() => setIsTitleSet(false)} className="text-pink-400">Edit</button></div> : <div className="flex gap-2 mb-4"><input type="text" value={tempTitle} onChange={(e) => setTempTitle(e.target.value)} placeholder="Judul" className="w-full bg-black/30 p-3 rounded-xl text-sm text-white focus:border-pink-500 outline-none" /><button onClick={() => { if(tempTitle) { setCampaignTitle(tempTitle); setIsTitleSet(true); } }} className="bg-pink-600 px-4 rounded-xl text-white text-xs">Set</button></div>}
							
							<label className="block text-[10px] text-gray-400 uppercase mb-1">Caption Bawaan</label>
							{isCaptionSet ? <div className="flex justify-between bg-black/30 p-3 rounded-xl mb-4 text-sm text-white">{campaignCaption} <button onClick={() => setIsCaptionSet(false)} className="text-pink-400">Edit</button></div> : <div className="flex gap-2 mb-4"><input type="text" value={tempCaption} onChange={(e) => setTempCaption(e.target.value)} placeholder="Caption" className="w-full bg-black/30 p-3 rounded-xl text-sm text-white focus:border-pink-500 outline-none" /><button onClick={() => { if(tempCaption) { setCampaignCaption(tempCaption); setIsCaptionSet(true); } }} className="bg-pink-600 px-4 rounded-xl text-white text-xs">Set</button></div>}
							
							<label className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed border-pink-500/30 rounded-xl cursor-pointer bg-pink-500/5 mb-4 hover:bg-pink-500/10 transition-colors">
								<p className="text-xs text-pink-300 font-semibold">{isUploadingFrame ? "Mengunggah..." : (activeFrame === EMPTY_FRAME ? "Upload Frame PNG" : "Ganti Frame")}</p>
								<input type="file" accept="image/png" onChange={handleFrameSelect} className="hidden" disabled={isUploadingFrame} />
							</label>
							
							<button onClick={generateLinkProcess} disabled={isGenerating} className={`w-full py-3 rounded-xl text-xs font-bold flex justify-center gap-2 ${isFormComplete ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg' : 'bg-gray-700 text-gray-500'}`}><LinkIcon size={14} />{isGenerating ? "Proses..." : "Generate Link"}</button>
							
							{generatedLink && (
								<div className="mt-4 p-3 bg-black/40 border border-white/10 rounded-xl flex gap-2">
									<input type="text" readOnly value={generatedLink} className="w-full bg-transparent text-xs text-white outline-none" />
									<button onClick={handleCopyLink} className="bg-pink-600 p-2 rounded-lg text-white">{isCopied ? <CheckCircle2 size={14} /> : <LinkIcon size={14} />}</button>
								</div>
							)}
						</div>
					)}
					
					{!isModeratorMode && <div className="p-5 border-b border-white/5"><h3 className="text-lg font-bold text-white mb-1">{campaignTitle}</h3><p className="text-xs text-gray-400">{campaignCaption}</p></div>}
					
					<div className="p-5 flex-1">
						{sidebarState == "landing" && <LandingPageSidebar onPhotoSelected={(img) => { setUserPhoto(img); setSidebarState("adjust"); }} />}
						{sidebarState == "adjust" && <AdjustPageSidebar onPhotoSelected={(img) => { setUserPhoto(img); setSidebarState("adjust"); }} transform={photoTransform} setTransform={setPhotoTransform} onGenerate={setSidebarState} />}
						{sidebarState === "ready" && <DownloadPageSidebar canvas={canvasRef} isPremium={isPremium} initialCaption={campaignCaption} onReset={handleResetPhoto} />}
					</div>
				</div>
			</div>
			<Analytics />
		</main>
	);
}

export default App;