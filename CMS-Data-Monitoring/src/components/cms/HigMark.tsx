export function HigMark() {
    return (
        <div className="flex flex-col items-center gap-xxs shrink-0" aria-hidden="true">
            <div className="flex gap-xxs">
                {["H", "I", "G"].map((l) => (
                    <span
                        key={l}
                        className="flex items-center justify-center w-[18px] h-[18px] border border-white/60 text-white text-[10px] font-bold"
                    >
                        {l}
                    </span>
                ))}
            </div>
            <span className="text-[8px] tracking-[0.2em] text-white/70 font-semibold">CAPITAL</span>
        </div>
    );
}
