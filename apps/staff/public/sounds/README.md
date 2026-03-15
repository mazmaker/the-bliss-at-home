# Sounds Directory

This directory contains audio files used by the Staff App.

## Background Music

Place your relaxing spa/massage background music file here with the name:
- `spa-music.mp3`

### Requirements:
- **Format**: MP3 (recommended) or any browser-supported audio format
- **Duration**: 3-10 minutes (will loop automatically)
- **Volume**: Music will be played at 40% volume by default
- **Style**: Relaxing spa/massage music (instrumental, ambient, nature sounds)

### Recommended Sources for Royalty-Free Music:
1. **Pixabay** (https://pixabay.com/music/) - Free, no attribution required
2. **Bensound** (https://www.bensound.com/) - Free with attribution
3. **YouTube Audio Library** - Free royalty-free music
4. **Incompetech** (https://incompetech.com/) - Free with attribution

### Example Search Terms:
- "spa music"
- "relaxing massage music"
- "meditation ambient"
- "zen instrumental"
- "nature sounds relaxation"

## How It Works

The background music will:
1. ✅ **Start playing** when staff clicks "เริ่มงาน" (Start Job)
2. 🔁 **Loop continuously** during the massage service
3. ⏹️ **Stop automatically** when staff clicks "เสร็จสิ้นงาน" (Complete Job) or cancels the job

## Volume Control

The default volume is set to 40% (0.4) for a comfortable background ambiance. You can adjust this in the code if needed:

```typescript
// In backgroundMusic.ts
backgroundAudio.volume = 0.4 // Change this value (0.0 to 1.0)
```

## Testing Without Music File

If you don't have a music file yet, the app will:
- Work normally without errors
- Log a warning in the console
- Continue functioning without background music

Once you add the `spa-music.mp3` file, refresh the page and the music will start working automatically.
