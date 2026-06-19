// Server component — the year is computed at render time on the server, so SSR
// and client markup agree (no hydration swap) and crawlers/no-JS see the right year.
export default function CopyrightYear() {
    return <span>{new Date().getFullYear()}</span>
}
