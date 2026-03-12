import React, { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Video, VideoOff, LogOut } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";

export default function VoiceChat() {
    const { tripId } = useParams();
    const navigate = useNavigate();
    const jitsiContainerRef = useRef(null);
    const apiRef = useRef(null);

    const [connected, setConnected] = useState(false);
    const [micEnabled, setMicEnabled] = useState(true);
    const [camEnabled, setCamEnabled] = useState(true);

    // ===============================
    // INIT JITSI
    // ===============================
    useEffect(() => {
        if (!tripId || apiRef.current) return;

        const domain = "meet.jit.si";
        const options = {
            // Include magic parameters to bypass the 8x8 promo page
            roomName: `AugenBlick_TripRoom_${tripId}#config.prejoinConfig.enabled=false&interfaceConfig.SHOW_PROMOTIONAL_CLOSE_PAGE=false`,
            parentNode: jitsiContainerRef.current,
            width: "100%",
            height: "100%",
            configOverwrite: {
                startWithAudioMuted: false,
                startWithVideoMuted: false,
                prejoinPageEnabled: false,
            },
            interfaceConfigOverwrite: {
                SHOW_JITSI_WATERMARK: false,
                DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
            },
            userInfo: {
                displayName: "Traveler",
            },
        };

        const api = new window.JitsiMeetExternalAPI(domain, options);
        apiRef.current = api;
        const iframe = api.getIFrame();
        iframe.allow =
            "camera *; microphone *; autoplay; fullscreen; display-capture";

        api.addListener("videoConferenceJoined", () => setConnected(true));
        api.addListener("audioMuteStatusChanged", ({ muted }) =>
            setMicEnabled(!muted)
        );
        api.addListener("videoMuteStatusChanged", ({ muted }) =>
            setCamEnabled(!muted)
        );
        api.addListener("readyToClose", () => {
            navigate(`/dashboard/trip/${tripId}`);
        });
        api.addListener("videoConferenceLeft", () => {
            navigate(`/dashboard/trip/${tripId}`);
        });

        return () => {
            api.dispose();
            apiRef.current = null;
        };
    }, [tripId]);

    const toggleMic = () => apiRef.current?.executeCommand("toggleAudio");
    const toggleCam = () => apiRef.current?.executeCommand("toggleVideo");

    const handleDisconnect = () => {
        apiRef.current?.executeCommand("hangup");
        apiRef.current?.dispose();
        apiRef.current = null;
        navigate(`/dashboard/trip/${tripId}`);
    };

    return (
        <div className="flex flex-col h-screen w-full bg-white overflow-hidden shadow-sm border border-gray-200">
            {/* HEADER */}
            <div className="flex justify-between items-center p-3 border-b border-gray-100 bg-gray-50/50">
                <div className="flex flex-col">
                    <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                        {`Trip ${tripId?.slice(-4) || 'Voice'} Chat`}
                        <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold animate-pulse">
                            LIVE
                        </span>
                    </h2>
                    <div className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5">
                        <span
                            className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-green-500" : "bg-yellow-500"
                                }`}
                        ></span>
                        {connected ? "Connected" : "Establishing connection..."}
                    </div>
                </div>

                {/* CONTROLS */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={toggleMic}
                        className={`p-1.5 rounded-lg transition-colors ${micEnabled
                            ? "bg-gray-100 hover:bg-gray-200 text-gray-700"
                            : "bg-red-50 text-red-500 hover:bg-red-100"
                            }`}
                    >
                        {micEnabled ? <Mic size={16} /> : <MicOff size={16} />}
                    </button>

                    <button
                        onClick={toggleCam}
                        className={`p-1.5 rounded-lg transition-colors ${camEnabled
                            ? "bg-gray-100 hover:bg-gray-200 text-gray-700"
                            : "bg-red-50 text-red-500 hover:bg-red-100"
                            }`}
                    >
                        {camEnabled ? <Video size={16} /> : <VideoOff size={16} />}
                    </button>

                    <div className="w-px h-5 bg-gray-200 mx-1"></div>

                    <button
                        onClick={handleDisconnect}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors font-semibold text-xs"
                    >
                        <LogOut size={14} /> Leave
                    </button>
                </div>
            </div>

            {/* JITSI VIDEO CONTAINER */}
            <div className="flex-1 bg-black relative">
                {!connected && (
                    <div className="absolute inset-0 flex items-center justify-center flex-col gap-3 bg-gray-50 z-0">
                        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-gray-500 font-medium text-xs">
                            Joining Voice Channel...
                        </p>
                    </div>
                )}
                <div ref={jitsiContainerRef} className="w-full h-full relative z-10" />
            </div>
        </div>
    );
}
