let context: AudioContext | undefined;
const recordings=new Map<string,ArrayBuffer>();
const decoded=new Map<string,AudioBuffer>();
let source:AudioBufferSourceNode|undefined;
let requestId=0;
export async function preloadPronunciations(urls:string[]) {
  await Promise.allSettled(urls.map(async url=>{
    const response=await fetch(url);if(response.ok) recordings.set(url,await response.arrayBuffer());
  }));
}
export function stopSpeech() {
  requestId++;source?.stop();source=undefined;
  if('speechSynthesis' in window) speechSynthesis.cancel();
}
export function unlockAudio() {
  const Constructor = window.AudioContext || (window as unknown as {webkitAudioContext:typeof AudioContext}).webkitAudioContext;
  if (Constructor) { context ??= new Constructor(); void context.resume(); }
}
export function chime(success=true) {
  if (!context) return;
  const start = context.currentTime;
  (success ? [523.25,659.25,783.99] : [392,440]).forEach((hz,i) => {
    const oscillator = context!.createOscillator(); const gain = context!.createGain();
    oscillator.type = 'sine'; oscillator.frequency.value = hz;
    gain.gain.setValueAtTime(0,start+i*.1); gain.gain.linearRampToValueAtTime(.09,start+i*.1+.02);
    gain.gain.exponentialRampToValueAtTime(.001,start+i*.1+.32);
    oscillator.connect(gain); gain.connect(context!.destination);
    oscillator.start(start+i*.1); oscillator.stop(start+i*.1+.33);
  });
}
export function speak(word:string, onUnavailable?:()=>void, audioUrl?:string) {
  stopSpeech();const current=requestId;
  const fallback=async()=>{
    if(!audioUrl||!context) {onUnavailable?.();return;}
    try {
      let buffer=decoded.get(audioUrl);
      if(!buffer) {
        let bytes=recordings.get(audioUrl);
        if(!bytes) {const response=await fetch(audioUrl);if(!response.ok)throw new Error('Recording unavailable');bytes=await response.arrayBuffer();recordings.set(audioUrl,bytes);}
        buffer=await context.decodeAudioData(bytes.slice(0));decoded.set(audioUrl,buffer);
      }
      if(current!==requestId) return;
      source=context.createBufferSource();source.buffer=buffer;source.connect(context.destination);source.start();
    } catch {if(current===requestId)onUnavailable?.();}
  };
  if (!('speechSynthesis' in window)) {void fallback();return;}
  const voices = speechSynthesis.getVoices();
  const english = voices.find(v=>v.lang === 'en-US') || voices.find(v=>v.lang.startsWith('en'));
  if(!english&&audioUrl) {void fallback();return;}
  const utterance = new SpeechSynthesisUtterance(word.toLowerCase());
  utterance.lang = 'en-US'; if (english) utterance.voice = english;
  utterance.rate = .72; utterance.pitch = 1.08;
  utterance.onerror = e => { if (e.error !== 'canceled' && e.error !== 'interrupted' && current===requestId) void fallback(); };
  speechSynthesis.speak(utterance);
}
