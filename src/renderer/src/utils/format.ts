export function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`
}

export function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function getFileIcon(ext: string, isDirectory: boolean): string {
  if (isDirectory) return '📁'

  const icons: Record<string, string> = {
    // Images
    '.jpg': '🖼️', '.jpeg': '🖼️', '.png': '🖼️', '.gif': '🖼️',
    '.webp': '🖼️', '.bmp': '🖼️', '.svg': '🖼️', '.ico': '🖼️',
    // Video
    '.mp4': '🎬', '.mkv': '🎬', '.avi': '🎬', '.mov': '🎬',
    '.wmv': '🎬', '.flv': '🎬', '.webm': '🎬',
    // Audio
    '.mp3': '🎵', '.wav': '🎵', '.flac': '🎵', '.aac': '🎵',
    '.ogg': '🎵', '.m4a': '🎵',
    // Documents
    '.pdf': '📄', '.doc': '📝', '.docx': '📝', '.xls': '📊',
    '.xlsx': '📊', '.ppt': '📊', '.pptx': '📊', '.txt': '📄',
    '.md': '📄', '.rtf': '📄',
    // Code
    '.js': '💻', '.ts': '💻', '.jsx': '💻', '.tsx': '💻',
    '.py': '💻', '.java': '💻', '.cpp': '💻', '.c': '💻',
    '.cs': '💻', '.go': '💻', '.rs': '💻', '.php': '💻',
    '.html': '💻', '.css': '💻', '.json': '💻', '.xml': '💻',
    // Archives
    '.zip': '📦', '.rar': '📦', '.7z': '📦', '.tar': '📦',
    '.gz': '📦', '.bz2': '📦',
    // Executables
    '.exe': '⚙️', '.msi': '⚙️', '.bat': '⚙️', '.cmd': '⚙️',
    '.sh': '⚙️', '.ps1': '⚙️'
  }

  return icons[ext.toLowerCase()] || '📄'
}

export function isImageFile(ext: string): boolean {
  return ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg', '.ico'].includes(ext.toLowerCase())
}

export function isTextFile(ext: string): boolean {
  return [
    '.txt', '.md', '.json', '.xml', '.csv', '.log', '.ini', '.cfg',
    '.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cpp', '.c',
    '.cs', '.go', '.rs', '.php', '.html', '.css', '.sh', '.bat',
    '.yml', '.yaml', '.toml', '.env', '.gitignore'
  ].includes(ext.toLowerCase())
}
