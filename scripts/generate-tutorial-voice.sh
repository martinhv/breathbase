#!/usr/bin/env bash
# Generate per-technique tutorial narrations via ElevenLabs.
#
# Renders longer prose tutorials (~30-45 s each) that explain how a
# technique works and what it does. Same pipeline as the onboarding
# narration: loudnorm only, no whisper FX or silence trim.
#
# Requires:
#   - ELEVENLABS_API_KEY env var (sourced from .env.local if present)
#   - curl + jq + ffmpeg
#
# Run from repo root:
#     ./scripts/generate-tutorial-voice.sh                          # default voice, all tutorials
#     ./scripts/generate-tutorial-voice.sh theo                     # specific voice, all tutorials
#     ./scripts/generate-tutorial-voice.sh -- box-breathing         # default voice, one tutorial
#     ./scripts/generate-tutorial-voice.sh theo -- box-breathing    # explicit voice + slug
#
# Output: public/voice/{voice}/tutorial-{technique-id}.mp3
#
# KEEP IN SYNC with TUTORIALS in src/lib/tutorials.ts.

set -euo pipefail

# Extract ELEVENLABS_API_KEY from .env.local without sourcing the whole file —
# Vite-style dotenv allows unquoted values with spaces (e.g. company names in
# VITE_LEGAL_*), which `sh source` chokes on.
if [[ -f .env.local && -z "${ELEVENLABS_API_KEY:-}" ]]; then
  line=$(grep -E '^ELEVENLABS_API_KEY=' .env.local | head -1) || true
  if [[ -n "$line" ]]; then
    value=${line#ELEVENLABS_API_KEY=}
    [[ "$value" == \"*\" && "$value" == *\" ]] && value=${value:1:-1}
    [[ "$value" == \'*\' && "$value" == *\' ]] && value=${value:1:-1}
    export ELEVENLABS_API_KEY="$value"
  fi
fi

: "${ELEVENLABS_API_KEY:?ELEVENLABS_API_KEY not set — needed for ElevenLabs API}"

# voice-id|model-id|stability|similarity_boost — mirrors generate-voice.sh
declare -A VOICES=(
  [theo]="UmQN7jS1Ee8B1czsUtQh|eleven_multilingual_v2|0.80|0.85"
  [sarah]="EXAVITQu4vr4xnSDxMaL|eleven_multilingual_v2|0.80|0.85"
  [priyanka]="BpjGufoPiobT79j2vtj4|eleven_multilingual_v2|0.80|0.85"
  [brittney]="pjcYQlDFKMbcOUp6F5GD|eleven_multilingual_v2|0.80|0.85"
  [christopher]="zO2z8i0srbO9r7GT5C4h|eleven_multilingual_v2|0.80|0.85"
  [leon]="MJ0RnG71ty4LH3dvNfSd|eleven_multilingual_v2|0.80|0.85"
  [lana]="rAmra0SCIYOxYmRNDSm3|eleven_multilingual_v2|0.80|0.85"
)

# Voices that render the GERMAN tutorial set (TUTORIALS_DE below).
DE_VOICES=(leon lana)
is_de_voice() {
  local id="$1"
  for v in "${DE_VOICES[@]}"; do
    if [[ "$v" == "$id" ]]; then return 0; fi
  done
  return 1
}

ALL_SLUGS=(
  physiological-sigh
  four-seven-eight
  diaphragmatic
  energizing-breath
  bellows-breath
  box-breathing
  coherent-breathing
  alternate-nostril
  equal-breathing
)

declare -A TUTORIALS=(
  [physiological-sigh]="The physiological sigh is the fastest way to settle your nervous system in real time. It's a pattern your body already uses on its own when you're upset — we just do it deliberately.

The mechanics are simple. Take a short inhale through your nose. Top it off with a second quick inhale — short and sharp. Then release everything in one long, extended exhale through your mouth.

That second inhale fully inflates the small air sacs in your lungs called alveoli. When the long exhale follows, it offloads a large pulse of carbon dioxide, which signals your brain to slow heart rate and ease arousal.

This single move can shift you out of a stress spike in seconds. It's been studied head-to-head against meditation and other breathwork — and for short-term mood lift, it came out on top. Use it any time you feel tension building. Just one or two cycles will work."

  [four-seven-eight]="Four-seven-eight breathing is a sleep-onset and relaxation technique. The numbers are the rhythm: inhale for four seconds, hold your breath for seven seconds, then exhale for eight seconds through pursed lips.

The long hold raises carbon dioxide slightly, which dilates blood vessels and increases vagal tone. The extended exhale activates your parasympathetic nervous system — the rest-and-digest side. Together they tip the body toward relaxation.

Use it lying in bed when your mind is racing. Many people find three or four cycles enough to fall asleep, though it takes a few days of practice before that becomes reliable.

Start gently. If holding for seven seconds feels stressful, scale the whole thing down — three-five-six works fine. Comfort matters more than hitting exact numbers. The point is the slow exhale."

  [diaphragmatic]="Diaphragmatic breathing — also called belly breathing — is the foundation everything else builds on. Most of us breathe shallowly into our chest. This technique trains your diaphragm to do the work it's designed for.

Place one hand on your chest, the other on your belly. Inhale slowly through your nose, expanding your belly outward — your chest hand should barely move. Then exhale slowly, a little longer than the inhale, letting your belly soften.

Why does this matter? Belly-led breathing stimulates the vagus nerve, the main highway of your parasympathetic nervous system. Heart rate drops. Blood pressure eases. Stress hormones decrease. Over time, your resting breath becomes deeper and slower without effort.

If you do nothing else, do this. Five minutes a day, ideally in the morning or before bed. It's the cheapest, most evidence-backed intervention in breathwork."

  [energizing-breath]="Energizing breath is a beginner-safe version of the Wim Hof Method. It uses cycles of fast, deliberate breathing followed by long breath holds to flood your body with oxygen and adrenaline.

The pattern is: thirty active breaths — a two-second nasal inhale, a one-second passive mouth exhale. Then a final full exhale, and a long breath hold while empty — until you feel the urge to breathe. Then a recovery inhale, hold full for fifteen seconds, and release. Repeat the whole sequence twice.

This raises sympathetic tone — the activating side of your nervous system. You'll likely feel warmth, tingling, and sharp alertness. Studies show it can voluntarily activate the immune response and increase focus.

Important safety: never do this in or near water, or while driving. Skip it if you're pregnant or have a cardiovascular condition. Stop immediately if you feel lightheaded — this technique can cause fainting."

  [bellows-breath]="Bellows breath, or bhastrika, is a quick way to wake the body and brain. The mechanics are simple but vigorous. Inhale forcefully through your nose for two seconds, then exhale forcefully through your nose for two seconds — equal, rhythmic, like a bellows pumping air.

You'll do about eight of these breaths in a round, then rest for fifteen seconds — a slow inhale to settle, and a longer exhale to release. Repeat for three rounds total.

The rapid breathing increases sympathetic tone, raising heart rate, alertness, and oxygenation. Yoga traditions use it before meditation to clear mental fog. Modern research confirms it shifts heart rate variability toward an activated state.

Sit upright with a straight spine. The breath should come from your abdomen, not your shoulders. If you feel lightheaded, stop and breathe normally — this is intense for beginners. Build up gradually."

  [box-breathing]="Box breathing follows a simple pattern of four equal parts. Inhale for four seconds. Hold your breath for four seconds. Exhale for four seconds. Then hold empty for four seconds. Each side of the box is the same length — that's where the name comes from.

This technique was popularized by Navy SEALs for use under high-stress situations. By keeping every phase equal, it stabilizes your autonomic nervous system without strongly tilting toward calming or activating. It's a balanced reset.

It's particularly useful before something stressful — a presentation, a difficult conversation, or any moment where you want to be alert but composed.

To begin, find a comfortable seated position. Breathe through your nose if you can. And don't strain — if four seconds feels long, start with three. Just five minutes is enough to feel the effect."

  [coherent-breathing]="Coherent breathing — also called resonant breathing — is breathing at a precise rate that synchronizes your heart, lungs, and nervous system into a single rhythm. The pattern is simple: inhale for five and a half seconds, exhale for five and a half seconds. That's about five and a half breaths per minute.

Why that exact number? Around five to six breaths per minute is the resonance frequency of your cardiovascular system. At this pace, your heart rate variability — the gold-standard marker of autonomic flexibility — reaches its maximum. Blood pressure stabilizes. Stress markers drop.

It's not a quick fix. It works through repetition. Ten to fifteen minutes a day, several times a week, retrains your baseline. Athletes, soldiers, and people with anxiety all use it as a foundational practice.

Use a guide — that's what we're for. The five-and-a-half second pace is hard to maintain on your own."

  [alternate-nostril]="Alternate nostril breathing — Nadi Shodhana in Sanskrit — balances the two sides of your nervous system by alternating which nostril you breathe through. It looks fiddly at first, but the rhythm is straightforward.

Inhale through your left nostril for four seconds. Close it, open the right, and exhale right for four seconds. Then inhale right for four. Switch, exhale left for four. That's one full cycle.

Traditionally you use your right hand: thumb to close the right nostril, ring finger to close the left. Or just imagine it — visualization works almost as well for the calming effect.

Research shows this practice improves attention, lowers blood pressure, and balances heart rate variability. Yogis use it before meditation to clear mental noise. It's particularly good before tasks requiring focus — work, study, anything demanding sustained attention.

Don't rush. The point is the slow, alternating rhythm, not the count."

  [equal-breathing]="Equal breathing, or sama vritti, is the simplest focus practice you can do. Inhale for four seconds. Exhale for four seconds. That's the entire technique.

The simplicity is the point. By making both halves of the breath the same length, you give your mind something steady to anchor to. Each inhale and exhale becomes a small unit of attention. When your mind wanders — and it will — you just return to the count.

This is the practice meditators have used for centuries. Modern research links sustained equal breathing to improved attention span, better emotional regulation, and reduced rumination. It's not flashy. It's foundational.

Use it as a five-minute attention reset between tasks. Or extend the count to six or eight seconds for a deeper effect — though four works fine. The key is consistency, not intensity."
)

# German tutorials — same slug names, German prose.
declare -A TUTORIALS_DE=(
  [physiological-sigh]="Der physiologische Seufzer ist der schnellste Weg, dein Nervensystem in Echtzeit zu beruhigen. Es ist ein Muster, das dein Körper schon von selbst nutzt, wenn du aufgewühlt bist — wir machen es nur bewusst.

Die Mechanik ist einfach. Atme kurz durch die Nase ein. Fülle mit einer zweiten, schnellen Einatmung nach — kurz und knapp. Dann lass alles in einer langen, ausgedehnten Ausatmung durch den Mund los.

Die zweite Einatmung dehnt die kleinen Lungenbläschen, die Alveolen, vollständig aus. Folgt die lange Ausatmung, gibt sie einen großen Schub Kohlendioxid ab — das signalisiert deinem Gehirn, die Herzfrequenz zu drosseln und die Erregung zu senken.

Diese eine Übung kann dich in Sekunden aus einer Stressspitze holen. Sie wurde direkt mit Meditation und anderen Atemtechniken verglichen — und beim kurzfristigen Stimmungsschub kam sie auf Platz eins. Setze sie ein, wann immer du Anspannung aufsteigen spürst. Schon ein bis zwei Zyklen wirken."

  [four-seven-eight]="Die Vier-Sieben-Acht-Atmung ist eine Einschlaf- und Entspannungstechnik. Die Zahlen sind der Rhythmus: vier Sekunden einatmen, sieben Sekunden den Atem halten, acht Sekunden durch gespitzte Lippen ausatmen.

Das lange Halten hebt den Kohlendioxid-Spiegel leicht an, wodurch sich die Blutgefäße weiten und der Vagustonus steigt. Die verlängerte Ausatmung aktiviert deinen Parasympathikus — die Ruhe-und-Verdauungs-Seite. Zusammen kippt der Körper in Richtung Entspannung.

Nutze sie im Bett, wenn dein Kopf nicht zur Ruhe kommt. Viele Menschen schlafen nach drei bis vier Zyklen ein, auch wenn es ein paar Tage Übung braucht, bis das verlässlich klappt.

Beginne sanft. Wenn sich sieben Sekunden halten zu anstrengend anfühlt, skaliere alles herunter — drei-fünf-sechs funktioniert ebenso. Komfort ist wichtiger als die exakten Zahlen. Es geht um die langsame Ausatmung."

  [diaphragmatic]="Die Zwerchfellatmung — auch Bauchatmung genannt — ist das Fundament, auf dem alles andere aufbaut. Die meisten von uns atmen flach in die Brust. Diese Technik trainiert dein Zwerchfell, die Arbeit zu tun, für die es gebaut ist.

Lege eine Hand auf die Brust, die andere auf den Bauch. Atme langsam durch die Nase ein, indem du den Bauch nach außen weitest — die Brusthand sollte sich kaum bewegen. Atme dann langsam aus, etwas länger als ein, und lass den Bauch wieder weich werden.

Warum ist das wichtig? Bauchgeführte Atmung stimuliert den Vagusnerv, die Hauptbahn deines Parasympathikus. Die Herzfrequenz sinkt. Der Blutdruck wird leichter. Stresshormone gehen zurück. Mit der Zeit wird auch dein Ruhe-Atem tiefer und langsamer, ohne Anstrengung.

Wenn du nur eine Sache machst, dann diese. Fünf Minuten am Tag, am besten morgens oder vor dem Schlafen. Es ist die günstigste und am besten belegte Intervention der Atemarbeit."

  [energizing-breath]="Energizing Breath ist eine anfängerfreundliche Variante der Wim-Hof-Methode. Sie nutzt Zyklen schneller, bewusster Atmung gefolgt von langen Atempausen, um Körper und Geist mit Sauerstoff und Adrenalin zu fluten.

Das Muster ist: dreißig aktive Atemzüge — zwei Sekunden Naseneinatmung, eine Sekunde passive Mundausatmung. Dann eine letzte volle Ausatmung und ein langes Halten in der leeren Lunge — bis du den Drang spürst, wieder zu atmen. Danach eine Erholungs-Einatmung, fünfzehn Sekunden voll halten, und loslassen. Wiederhole das Ganze zweimal.

Das hebt den sympathischen Tonus — die aktivierende Seite deines Nervensystems. Du wirst wahrscheinlich Wärme, Kribbeln und scharfe Wachheit spüren. Studien zeigen, dass sich damit die Immunreaktion willentlich aktivieren und der Fokus steigern lässt.

Wichtige Sicherheit: niemals im oder am Wasser üben, nicht beim Autofahren. Aussetzen in der Schwangerschaft oder bei Herz-Kreislauf-Erkrankungen. Sofort stoppen, wenn dir schwindlig wird — diese Technik kann Ohnmacht auslösen."

  [bellows-breath]="Die Blasebalg-Atmung, Bhastrika, ist ein schneller Weg, Körper und Gehirn zu wecken. Die Mechanik ist einfach, aber kraftvoll. Atme zwei Sekunden lang kraftvoll durch die Nase ein, dann zwei Sekunden lang kraftvoll durch die Nase aus — gleich, rhythmisch, wie ein Blasebalg, der Luft pumpt.

Du machst etwa acht solcher Atemzüge pro Runde, dann fünfzehn Sekunden Pause — eine langsame Einatmung zum Ankommen und eine längere Ausatmung zum Loslassen. Drei Runden insgesamt.

Die schnelle Atmung erhöht den sympathischen Tonus — Herzfrequenz, Wachheit und Sauerstoffversorgung steigen. Im Yoga wird sie vor der Meditation eingesetzt, um geistigen Nebel zu klären. Moderne Forschung bestätigt, dass sie die Herzratenvariabilität in einen aktivierten Zustand verschiebt.

Sitze aufrecht mit geradem Rücken. Der Atem soll aus dem Bauch kommen, nicht aus den Schultern. Wenn dir schwindlig wird, höre auf und atme normal — für Anfänger ist das intensiv. Steigere dich langsam."

  [box-breathing]="Box-Atmung folgt einem einfachen Muster aus vier gleichen Abschnitten. Vier Sekunden einatmen. Vier Sekunden halten. Vier Sekunden ausatmen. Dann vier Sekunden leer halten. Jede Seite des Quadrats ist gleich lang — daher der Name.

Diese Technik wurde von den Navy SEALs für Einsätze unter hohem Stress bekannt gemacht. Weil jede Phase gleich lang ist, stabilisiert sie dein autonomes Nervensystem, ohne stark in Richtung Beruhigung oder Aktivierung zu kippen. Es ist ein ausgewogener Reset.

Sie ist besonders nützlich vor etwas Stressigem — einer Präsentation, einem schwierigen Gespräch oder jedem Moment, in dem du wach, aber gefasst sein willst.

Setz dich bequem hin. Atme durch die Nase, wenn möglich. Und überanstrenge dich nicht — wenn sich vier Sekunden lang anfühlt, beginne mit drei. Schon fünf Minuten reichen, um die Wirkung zu spüren."

  [coherent-breathing]="Kohärente Atmung — auch Resonanzatmung — bedeutet, in einem präzisen Rhythmus zu atmen, der Herz, Lunge und Nervensystem in einen gemeinsamen Takt bringt. Das Muster ist einfach: fünfeinhalb Sekunden einatmen, fünfeinhalb Sekunden ausatmen. Das sind etwa fünfeinhalb Atemzüge pro Minute.

Warum genau diese Zahl? Rund fünf bis sechs Atemzüge pro Minute treffen die Resonanzfrequenz deines Herz-Kreislauf-Systems. In diesem Tempo erreicht die Herzratenvariabilität — der Goldstandard-Marker für autonome Flexibilität — ihr Maximum. Der Blutdruck stabilisiert sich. Stress-Marker sinken.

Es ist keine schnelle Lösung. Sie wirkt durch Wiederholung. Zehn bis fünfzehn Minuten am Tag, mehrmals pro Woche, trainieren deine Grundlinie neu. Sportler, Soldaten und Menschen mit Ängsten nutzen es als Grundpraxis.

Lass dich führen — dafür sind wir da. Den Fünfeinhalb-Sekunden-Takt allein zu halten, ist schwer."

  [alternate-nostril]="Wechselatmung — Nadi Shodhana im Sanskrit — gleicht die beiden Seiten deines Nervensystems aus, indem du abwechselnd durch das eine und das andere Nasenloch atmest. Auf den ersten Blick wirkt es umständlich, der Rhythmus ist aber unkompliziert.

Atme vier Sekunden durch das linke Nasenloch ein. Schließe es, öffne das rechte, und atme vier Sekunden rechts aus. Dann vier Sekunden rechts einatmen. Wechseln, vier Sekunden links ausatmen. Das ist ein voller Zyklus.

Traditionell benutzt man die rechte Hand: Daumen, um das rechte Nasenloch zu schließen, Ringfinger für das linke. Oder stell es dir nur vor — Visualisierung wirkt für den beruhigenden Effekt fast genauso gut.

Forschung zeigt: diese Praxis verbessert Aufmerksamkeit, senkt den Blutdruck und gleicht die Herzratenvariabilität aus. Yogis nutzen sie vor der Meditation, um mentalen Lärm zu klären. Besonders gut vor Aufgaben, die Konzentration verlangen — Arbeit, Lernen, alles, was länger Aufmerksamkeit braucht.

Beeile dich nicht. Es geht um den langsamen, wechselnden Rhythmus, nicht um die Zählung."

  [equal-breathing]="Gleichmäßige Atmung, Sama Vritti, ist die einfachste Fokuspraxis, die du machen kannst. Vier Sekunden einatmen. Vier Sekunden ausatmen. Das ist die ganze Technik.

Die Einfachheit ist der Punkt. Indem beide Hälften des Atems gleich lang sind, gibst du deinem Geist einen festen Anker. Jede Ein- und Ausatmung wird zu einer kleinen Einheit Aufmerksamkeit. Wandern die Gedanken ab — und das werden sie — kehrst du einfach zur Zählung zurück.

Das ist die Praxis, die Meditierende seit Jahrhunderten nutzen. Moderne Forschung verbindet anhaltende gleichmäßige Atmung mit besserer Aufmerksamkeitsspanne, besserer Emotionsregulation und weniger Grübeln. Sie ist nicht spektakulär. Sie ist grundlegend.

Nutze sie als fünfminütigen Aufmerksamkeits-Reset zwischen Aufgaben. Oder dehne die Zählung auf sechs oder acht Sekunden, für tiefere Wirkung — vier funktioniert aber genauso. Der Schlüssel ist Beständigkeit, nicht Intensität."
)

# Split args at "--" separator: voices before, slugs after.
TARGET_VOICES=()
TARGET_SLUGS=()
seen_sep=0
for arg in "$@"; do
  if [[ "$arg" == "--" ]]; then seen_sep=1; continue; fi
  if [[ $seen_sep -eq 0 ]]; then
    TARGET_VOICES+=("$arg")
  else
    TARGET_SLUGS+=("$arg")
  fi
done
[[ ${#TARGET_VOICES[@]} -eq 0 ]] && TARGET_VOICES=(theo)
[[ ${#TARGET_SLUGS[@]} -eq 0 ]] && TARGET_SLUGS=("${ALL_SLUGS[@]}")

TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT

HEADER_FILE="$TMP_DIR/elevenlabs-headers"
( umask 077 && {
    echo "xi-api-key: $ELEVENLABS_API_KEY"
    echo "Content-Type: application/json"
    echo "Accept: audio/mpeg"
  } > "$HEADER_FILE" )

LOUDNORM='loudnorm=I=-22:LRA=7:TP=-1.5'

for voice in "${TARGET_VOICES[@]}"; do
  if [[ -z "${VOICES[$voice]+x}" ]]; then
    echo "Unknown voice: $voice" >&2
    echo "Available: ${!VOICES[*]}" >&2
    exit 1
  fi
  IFS='|' read -r voice_id model_id stability sim <<< "${VOICES[$voice]}"
  out_dir="public/voice/$voice"
  mkdir -p "$out_dir"
  echo "=== $voice (model=$model_id) ==="

  if is_de_voice "$voice"; then
    declare -n active_tutorials=TUTORIALS_DE
  else
    declare -n active_tutorials=TUTORIALS
  fi

  for slug in "${TARGET_SLUGS[@]}"; do
    if [[ -z "${active_tutorials[$slug]+x}" ]]; then
      echo "Unknown tutorial slug: $slug" >&2
      echo "Available: ${ALL_SLUGS[*]}" >&2
      exit 1
    fi
    text="${active_tutorials[$slug]}"
    out_file="$out_dir/tutorial-$slug.mp3"
    raw_file="$TMP_DIR/$voice-$slug-raw.mp3"
    echo "  $slug (${#text} chars)"

    body=$(jq -nc \
      --arg text "$text" \
      --arg model "$model_id" \
      --argjson stability "$stability" \
      --argjson sim "$sim" \
      '{text: $text, model_id: $model, voice_settings: {stability: $stability, similarity_boost: $sim}}')

    for attempt in 1 2 3 4; do
      status=$(curl -sS -X POST \
        -H @"$HEADER_FILE" \
        --data-binary "$body" \
        -o "$raw_file" \
        -w '%{http_code}' \
        "https://api.elevenlabs.io/v1/text-to-speech/$voice_id")
      if [[ "$status" == "200" ]]; then break; fi
      if [[ "$status" == "429" && "$attempt" -lt 4 ]]; then
        sleep $((attempt * 3))
        continue
      fi
      echo "    ElevenLabs returned HTTP $status:" >&2
      head -c 400 "$raw_file" >&2; echo >&2
      exit 1
    done

    ffmpeg -y -loglevel error -i "$raw_file" -af "$LOUDNORM" "$out_file"
    ls -lh "$out_file" | awk '{ printf "    %s  %s\n", $5, $NF }'
  done
done

echo
echo "Done. Files under public/voice/{voice}/tutorial-*.mp3"
