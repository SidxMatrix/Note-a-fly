// apps/web/src/lib/exportPdf.ts

import jsPDF from "jspdf";

interface Note {
  id: string;
  content: string;
}

interface Flashcard {
  id: string;
  front: string;
  back: string;
  difficulty: "easy" | "medium" | "hard";
}

interface ExamQuestion {
  question: string;
  options: string[] | null;
  correct_answer: string;
  explanation: string | null;
}

interface ExportData {
  sessionTitle: string;
  sourceType: string;
  createdAt: string;
  notes: Note[];
  flashcards: Flashcard[];
  quizQuestions: ExamQuestion[];
  examQuestions: ExamQuestion[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")   // bold
    .replace(/\*(.*?)\*/g, "$1")        // italic
    .replace(/`(.*?)`/g, "$1")          // inline code
    .replace(/^#{1,3}\s/gm, "")         // headings
    .replace(/^[-*•]\s/gm, "• ")        // bullets
    .replace(/\|/g, " ")                // tables
    .replace(/[-]{2,}/g, "")            // dividers
    .trim();
}

function addPageIfNeeded(doc: jsPDF, y: number, margin: number, pageHeight: number, extraSpace = 20): number {
  if (y + extraSpace > pageHeight - margin) {
    doc.addPage();
    return margin;
  }
  return y;
}

function drawSectionHeader(
  doc: jsPDF,
  text: string,
  y: number,
  pageWidth: number,
  margin: number
): number {
  // Dark background bar
  doc.setFillColor(27, 27, 27);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 10, 2, 2, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(text.toUpperCase(), margin + 4, y + 6.5);

  doc.setTextColor(27, 27, 27);
  return y + 16;
}

function drawDivider(doc: jsPDF, y: number, margin: number, pageWidth: number): number {
  doc.setDrawColor(238, 238, 238);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  return y + 6;
}

// ─── Main Export Function ─────────────────────────────────────────────────────

export async function exportSessionPDF(data: ExportData): Promise<void> {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });

  const pageWidth  = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin     = 18;
  const contentW   = pageWidth - margin * 2;

  // ── Brand colors ──
  const purple    : [number, number, number] = [118, 113, 255];
  const deepPurple: [number, number, number] = [15,  0,   105];
  const dark      : [number, number, number] = [27,  27,  27 ];
  const grey      : [number, number, number] = [99,  98,  98 ];
  const lightGrey : [number, number, number] = [238, 238, 238];

  let y = margin;

  // ══════════════════════════════════════════════════════
  // COVER BLOCK
  // ══════════════════════════════════════════════════════

  // Purple accent top bar
  doc.setFillColor(...purple);
  doc.rect(0, 0, pageWidth, 2, "F");

  // App name
  doc.setFont("helvetica", "bolditalic");
  doc.setFontSize(11);
  doc.setTextColor(...purple);
  doc.text("Note-a-fly", margin, y + 8);

  // Tagline
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...grey);
  doc.text("THE LIVING MANUSCRIPT", margin, y + 13);

  // Export date (right aligned)
  const exportDate = new Date().toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
  doc.setFontSize(7);
  doc.text(`Exported ${exportDate}`, pageWidth - margin, y + 8, { align: "right" });

  y += 22;

  // Source type pill
  doc.setFillColor(226, 223, 255);
  doc.roundedRect(margin, y, 36, 6, 1.5, 1.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(...deepPurple);
  doc.text(data.sourceType.toUpperCase(), margin + 4, y + 4.2);

  // Created date
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...grey);
  doc.text(data.createdAt, margin + 42, y + 4.2);

  y += 12;

  // Session Title
  doc.setFont("helvetica", "bolditalic");
  doc.setFontSize(26);
  doc.setTextColor(...dark);
  const titleLines = doc.splitTextToSize(data.sessionTitle, contentW);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 10 + 2;

  // Purple underline
  doc.setFillColor(...purple);
  doc.rect(margin, y, 14, 1.5, "F");
  y += 8;

  // Stats row
  const stats = [
    { label: "Notes",          value: String(data.notes.length)         },
    { label: "Flashcards",     value: String(data.flashcards.length)    },
    { label: "Quiz Questions", value: String(data.quizQuestions.length) },
    { label: "Exam Q&A",       value: String(data.examQuestions.length) },
  ];

  const statW = contentW / stats.length;
  stats.forEach((stat, i) => {
    const sx = margin + i * statW;
    doc.setFillColor(...lightGrey);
    doc.roundedRect(sx, y, statW - 3, 14, 2, 2, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(...dark);
    doc.text(stat.value, sx + (statW - 3) / 2, y + 7, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...grey);
    doc.text(stat.label, sx + (statW - 3) / 2, y + 12, { align: "center" });
  });

  y += 22;
  y = drawDivider(doc, y, margin, pageWidth);

  // ══════════════════════════════════════════════════════
  // SECTION 1 — NOTES
  // ══════════════════════════════════════════════════════

  if (data.notes.length > 0) {
    y = addPageIfNeeded(doc, y, margin, pageHeight, 30);
    y = drawSectionHeader(doc, "📄  Study Notes", y, pageWidth, margin);

    data.notes.forEach((note) => {
      const lines = note.content.split("\n").filter((l) => l.trim() !== "");

      lines.forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed) return;

        y = addPageIfNeeded(doc, y, margin, pageHeight, 12);

        // H1
        if (/^#\s/.test(trimmed)) {
          const text = stripMarkdown(trimmed.replace(/^#\s/, ""));
          doc.setFont("helvetica", "bolditalic");
          doc.setFontSize(14);
          doc.setTextColor(...dark);
          const wrapped = doc.splitTextToSize(text, contentW);
          doc.text(wrapped, margin, y);
          y += wrapped.length * 6 + 1;
          doc.setFillColor(...purple);
          doc.rect(margin, y, 10, 0.8, "F");
          y += 5;
          return;
        }

        // H2
        if (/^##\s/.test(trimmed)) {
          const text = stripMarkdown(trimmed.replace(/^##\s/, ""));
          doc.setFont("helvetica", "bolditalic");
          doc.setFontSize(11);
          doc.setTextColor(...dark);
          const wrapped = doc.splitTextToSize(text, contentW);
          doc.text(wrapped, margin, y);
          y += wrapped.length * 5.5 + 3;
          return;
        }

        // H3
        if (/^###\s/.test(trimmed)) {
          const text = stripMarkdown(trimmed.replace(/^###\s/, ""));
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8);
          doc.setTextColor(...grey);
          doc.text(text.toUpperCase(), margin, y);
          y += 6;
          return;
        }

        // Bullet
        if (/^[-*•]\s/.test(trimmed)) {
          const text = stripMarkdown(trimmed.replace(/^[-*•]\s/, ""));
          doc.setFillColor(...purple);
          doc.circle(margin + 1.5, y - 1.2, 0.8, "F");
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9);
          doc.setTextColor(42, 42, 42);
          const wrapped = doc.splitTextToSize(text, contentW - 6);
          doc.text(wrapped, margin + 5, y);
          y += wrapped.length * 5 + 1.5;
          return;
        }

        // Callout keywords
        if (/key insight|exam alert|pro tip|note:/i.test(trimmed)) {
          const text = stripMarkdown(trimmed);
          doc.setFillColor(226, 223, 255);
          const wrapped = doc.splitTextToSize(text, contentW - 10);
          const boxH = wrapped.length * 5 + 6;
          y = addPageIfNeeded(doc, y, margin, pageHeight, boxH + 4);
          doc.roundedRect(margin, y - 4, contentW, boxH, 2, 2, "F");
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8.5);
          doc.setTextColor(...deepPurple);
          doc.text(wrapped, margin + 5, y + 1);
          y += boxH + 3;
          return;
        }

        // Divider
        if (/^(-{2,}|\*{3,})$/.test(trimmed)) {
          y = drawDivider(doc, y, margin, pageWidth);
          return;
        }

        // Regular paragraph
        const text = stripMarkdown(trimmed);
        if (!text) return;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(58, 58, 58);
        const wrapped = doc.splitTextToSize(text, contentW);
        y = addPageIfNeeded(doc, y, margin, pageHeight, wrapped.length * 5 + 2);
        doc.text(wrapped, margin, y);
        y += wrapped.length * 5 + 2;
      });

      y += 4;
    });
  }

  // ══════════════════════════════════════════════════════
  // SECTION 2 — FLASHCARDS
  // ══════════════════════════════════════════════════════

  if (data.flashcards.length > 0) {
    doc.addPage();
    y = margin + 4;
    y = drawSectionHeader(doc, "🃏  Flashcards", y, pageWidth, margin);

    const cardW = (contentW - 6) / 2;

    data.flashcards.forEach((card, i) => {
      const col    = i % 2;
      const cx     = margin + col * (cardW + 6);
      const cardH  = 38;

      if (col === 0) {
        y = addPageIfNeeded(doc, y, margin, pageHeight, cardH + 6);
      }

      // Difficulty color
      const diffColor: Record<string, [number, number, number]> =
        { easy: [34, 197, 94], medium: [245, 158, 11], hard: [239, 68, 68] };
      const dc = diffColor[card.difficulty] ?? diffColor.medium;

      // Card background
      doc.setFillColor(17, 17, 17);
      doc.roundedRect(cx, y, cardW, cardH, 3, 3, "F");

      // Purple top accent
      doc.setFillColor(...purple);
      doc.roundedRect(cx, y, cardW, 1.2, 0.5, 0.5, "F");

      // Difficulty badge
      doc.setFillColor(...dc, 0.2);
      doc.roundedRect(cx + cardW - 22, y + 4, 18, 5, 1, 1, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(5.5);
      doc.setTextColor(...dc);
      doc.text((card.difficulty ?? "medium").toUpperCase(), cx + cardW - 13, y + 7.5, { align: "center" });

      // Q label
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6);
      doc.setTextColor(...purple);
      doc.text("QUESTION", cx + 4, y + 8);

      // Front text
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(224, 224, 224);
      const frontLines = doc.splitTextToSize(card.front, cardW - 8);
      doc.text(frontLines.slice(0, 3), cx + 4, y + 14);

      // Divider inside card
      doc.setDrawColor(50, 50, 50);
      doc.setLineWidth(0.2);
      doc.line(cx + 4, y + 24, cx + cardW - 4, y + 24);

      // A label
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6);
      doc.setTextColor(...purple);
      doc.text("ANSWER", cx + 4, y + 28);

      // Back text
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(200, 200, 200);
      const backText = (card as any).back || (card as any).answer || "";
      const backLines = doc.splitTextToSize(backText, cardW - 8);
      doc.text(backLines.slice(0, 2), cx + 4, y + 33);

      if (col === 1 || i === data.flashcards.length - 1) {
        y += cardH + 5;
      }
    });
  }

  // ══════════════════════════════════════════════════════
  // SECTION 3 — QUIZ
  // ══════════════════════════════════════════════════════

  if (data.quizQuestions.length > 0) {
    doc.addPage();
    y = margin + 4;
    y = drawSectionHeader(doc, "❓  Quiz", y, pageWidth, margin);

    data.quizQuestions.forEach((q, i) => {
      const options = (q.options && q.options.length > 0) ? q.options : [q.correct_answer];
      const estimatedH = 14 + options.length * 7 + (q.explanation ? 14 : 0);
      y = addPageIfNeeded(doc, y, margin, pageHeight, estimatedH);

      // Question number bubble
      doc.setFillColor(226, 223, 255);
      doc.circle(margin + 3.5, y + 3, 3.5, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(...deepPurple);
      doc.text(String(i + 1), margin + 3.5, y + 4.7, { align: "center" });

      // Question text
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(...dark);
      const qLines = doc.splitTextToSize(q.question, contentW - 10);
      doc.text(qLines, margin + 9, y + 4);
      y += qLines.length * 5.5 + 4;

      // Options
      options.forEach((opt, j) => {
        const isCorrect = opt === q.correct_answer;
        y = addPageIfNeeded(doc, y, margin, pageHeight, 9);

        if (isCorrect) {
          doc.setFillColor(27, 27, 27);
          doc.roundedRect(margin + 9, y - 3, contentW - 9, 7.5, 1.5, 1.5, "F");
        } else {
          doc.setFillColor(249, 249, 249);
          doc.roundedRect(margin + 9, y - 3, contentW - 9, 7.5, 1.5, 1.5, "F");
        }

        // Letter circle
        doc.setFillColor(isCorrect ? 118 : 238, isCorrect ? 113 : 238, isCorrect ? 255 : 238);
        doc.circle(margin + 15, y + 0.5, 2.8, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.setTextColor(isCorrect ? 255 : 100, isCorrect ? 255 : 100, isCorrect ? 255 : 100);
        doc.text(String.fromCharCode(65 + j), margin + 15, y + 2, { align: "center" });

        doc.setFont("helvetica", isCorrect ? "bold" : "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(isCorrect ? 255 : 27, isCorrect ? 255 : 27, isCorrect ? 255 : 27);
        const optLines = doc.splitTextToSize(opt, contentW - 22);
        doc.text(optLines, margin + 20, y + 1.5);
        y += optLines.length * 5 + 3;
      });

      // Explanation
      if (q.explanation) {
        y = addPageIfNeeded(doc, y, margin, pageHeight, 16);
        doc.setFillColor(226, 223, 255);
        const expLines = doc.splitTextToSize(q.explanation, contentW - 18);
        const expH = expLines.length * 4.5 + 8;
        doc.roundedRect(margin + 9, y, contentW - 9, expH, 2, 2, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(...purple);
        doc.text("WHY THIS ANSWER", margin + 13, y + 5);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(...deepPurple);
        doc.text(expLines, margin + 13, y + 10);
        y += expH + 4;
      }

      y += 4;
      y = drawDivider(doc, y, margin, pageWidth);
    });
  }

  // ══════════════════════════════════════════════════════
  // SECTION 4 — EXAM Q&A
  // ══════════════════════════════════════════════════════

  if (data.examQuestions.length > 0) {
    doc.addPage();
    y = margin + 4;
    y = drawSectionHeader(doc, "🎓  Exam Q&A", y, pageWidth, margin);

    data.examQuestions.forEach((q, i) => {
      const ansLines  = doc.splitTextToSize(q.correct_answer || "", contentW - 10);
      const estimatedH = 16 + ansLines.length * 5 + 8;
      y = addPageIfNeeded(doc, y, margin, pageHeight, estimatedH);

      // Q label
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(...purple);
      doc.text(`Q${i + 1}`, margin, y + 4);

      // Question
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...dark);
      const qLines = doc.splitTextToSize(q.question, contentW - 10);
      doc.text(qLines, margin + 8, y + 4);
      y += qLines.length * 5.5 + 6;

      // Answer block
      doc.setFillColor(17, 17, 17);
      const ansH = ansLines.length * 5 + 10;
      y = addPageIfNeeded(doc, y, margin, pageHeight, ansH + 4);
      doc.roundedRect(margin, y, contentW, ansH, 2, 2, "F");

      doc.setFillColor(...purple);
      doc.rect(margin, y, 2, ansH, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      doc.setTextColor(...purple);
      doc.text("MODEL ANSWER", margin + 6, y + 6);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(224, 224, 224);
      doc.text(ansLines, margin + 6, y + 12);
      y += ansH + 6;

      y = drawDivider(doc, y, margin, pageWidth);
    });
  }

  // ══════════════════════════════════════════════════════
  // FOOTER ON EVERY PAGE
  // ══════════════════════════════════════════════════════

  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);

    // Bottom accent bar
    doc.setFillColor(...purple);
    doc.rect(0, pageHeight - 1.5, pageWidth, 1.5, "F");

    // Page number
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...grey);
    doc.text(`${p} / ${totalPages}`, pageWidth / 2, pageHeight - 4, { align: "center" });

    // Branding
    doc.setFont("helvetica", "bolditalic");
    doc.setFontSize(7);
    doc.setTextColor(...purple);
    doc.text("Note-a-fly", margin, pageHeight - 4);
  }

  // ── Save ──
  const safeTitle = data.sessionTitle.replace(/[^a-z0-9]/gi, "_").toLowerCase();
  doc.save(`note-a-fly_${safeTitle}.pdf`);
}