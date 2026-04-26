import { Injectable } from '@nestjs/common';
import { PaymentStatus } from '@prisma/client';
import * as ExcelJS from 'exceljs';
import * as fs from 'fs';
import * as path from 'path';
import PDFDocument from 'pdfkit';
import { PrismaService } from '../prisma/prisma.service';
import {
  AttendanceReportQueryDto,
  DateRangeQueryDto,
  PaymentsReportQueryDto,
  StudentsReportQueryDto,
} from './dto/reports-query.dto';

// ─── helpers ────────────────────────────────────────────────────────────────

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('ru-RU');
}

// Locate bundled TTF fonts that ship Cyrillic glyphs.
// Works both in dev (project root) and in production (where the compiled `dist`
// runs from a sub-directory). We walk up from cwd until we find `assets/fonts`.
function resolveAssetsDir(): string {
  const candidates = [
    path.resolve(process.cwd(), 'assets/fonts'),
    path.resolve(process.cwd(), '../assets/fonts'),
    path.resolve(__dirname, '../../assets/fonts'),
    path.resolve(__dirname, '../../../assets/fonts'),
  ];
  return candidates.find((p) => fs.existsSync(p)) ?? candidates[0];
}

const FONT_DIR = resolveAssetsDir();
const FONT_REGULAR = path.join(FONT_DIR, 'Roboto-Regular.ttf');
const FONT_BOLD = path.join(FONT_DIR, 'Roboto-Bold.ttf');

/**
 * Registers our bundled Cyrillic-capable fonts as `body` and `bold` aliases
 * inside the document, then sets `body` as the active font. PDFKit ships only
 * the 14 base PDF fonts which lack Cyrillic — without this every Russian glyph
 * is rendered as garbage. If the asset files are missing (e.g. the deploy
 * skipped them), the aliases fall back to the built-in Helvetica family so
 * that PDF generation still succeeds and Latin output is correct.
 */
function setupCyrillicFonts(doc: PDFKit.PDFDocument): void {
  const hasRegular = fs.existsSync(FONT_REGULAR);
  const hasBold = fs.existsSync(FONT_BOLD);

  doc.registerFont('body', hasRegular ? FONT_REGULAR : 'Helvetica');
  doc.registerFont('bold', hasBold ? FONT_BOLD : 'Helvetica-Bold');
  doc.font('body');

  if (!hasRegular || !hasBold) {
    // Fallback path — log once so deploy issues are visible in Railway logs.
    console.warn(
      `[reports] Cyrillic fonts not found in ${FONT_DIR}; falling back to Helvetica`,
    );
  }
}

function headerStyle(ws: ExcelJS.Worksheet, row: number, colCount: number) {
  const r = ws.getRow(row);
  r.eachCell({ includeEmpty: true }, (cell, col) => {
    if (col > colCount) return;
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4F46E5' },
    };
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });
  r.height = 22;
}

// ─── service ────────────────────────────────────────────────────────────────

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  // ── PAYMENTS EXCEL (legacy) ──────────────────────────────────────────────

  async paymentsExcel(query: PaymentsReportQueryDto): Promise<Buffer> {
    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.groupId) {
      where.student = { groups: { some: { groupId: query.groupId } } };
    }
    if (query.from || query.to) {
      where.createdAt = {};
      if (query.from) where.createdAt.gte = new Date(query.from);
      if (query.to) where.createdAt.lte = new Date(query.to);
    }

    const payments = await this.prisma.payment.findMany({
      where,
      include: {
        student: {
          select: {
            fullName: true,
            groups: {
              orderBy: { joinedAt: 'asc' },
              select: { group: { select: { name: true } } },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const wb = new ExcelJS.Workbook();
    wb.creator = 'MathCenter';
    const ws = wb.addWorksheet('Платежи');

    ws.columns = [
      { header: '№', key: 'num', width: 6 },
      { header: 'Ученик', key: 'student', width: 28 },
      { header: 'Группа', key: 'group', width: 20 },
      { header: 'Сумма', key: 'amount', width: 14 },
      { header: 'Статус', key: 'status', width: 16 },
      { header: 'Дата создания', key: 'createdAt', width: 18 },
      { header: 'Дата подтверждения', key: 'confirmedAt', width: 22 },
    ];

    headerStyle(ws, 1, 7);

    const statusLabels: Record<string, string> = {
      PENDING: 'Ожидает',
      CONFIRMED: 'Подтверждён',
      REJECTED: 'Отклонён',
    };

    payments.forEach((p, i) => {
      const groupNames = p.student.groups.map((link) => link.group.name);
      const row = ws.addRow({
        num: i + 1,
        student: p.student.fullName,
        group: groupNames.length === 0 ? '—' : groupNames.join(', '),
        amount: Number(p.amount),
        status: statusLabels[p.status] ?? p.status,
        createdAt: fmtDate(p.createdAt),
        confirmedAt: fmtDate(p.confirmedAt),
      });

      const statusColors: Record<string, string> = {
        Подтверждён: 'FFD1FAE5',
        Ожидает: 'FFFEF9C3',
        Отклонён: 'FFFEE2E2',
      };
      const bg = statusColors[statusLabels[p.status]] ?? 'FFFFFFFF';
      row.eachCell({ includeEmpty: true }, (cell, col) => {
        if (col > 7) return;
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: bg },
        };
        if (col === 4) {
          cell.numFmt = '#,##0.00 "сум"';
          cell.alignment = { horizontal: 'right' };
        }
      });
    });

    const totalRow = ws.addRow({
      num: '',
      student: 'ИТОГО',
      group: '',
      amount: payments
        .filter((p) => p.status === PaymentStatus.CONFIRMED)
        .reduce((s, p) => s + Number(p.amount), 0),
      status: '',
      createdAt: '',
      confirmedAt: '',
    });
    totalRow.font = { bold: true };
    totalRow.getCell(4).numFmt = '#,##0.00 "сум"';

    ws.autoFilter = { from: 'A1', to: 'G1' };

    const buf = await wb.xlsx.writeBuffer();
    return Buffer.from(buf);
  }

  // ── FINANCE EXCEL (multi-sheet) ──────────────────────────────────────────

  async financeExcel(query: PaymentsReportQueryDto): Promise<Buffer> {
    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.groupId) {
      where.student = { groups: { some: { groupId: query.groupId } } };
    }
    if (query.from || query.to) {
      where.createdAt = {};
      if (query.from) where.createdAt.gte = new Date(query.from);
      if (query.to) where.createdAt.lte = new Date(query.to);
    }

    const allPaymentsWhere: any = {};
    if (query.from || query.to) {
      allPaymentsWhere.createdAt = {};
      if (query.from) allPaymentsWhere.createdAt.gte = new Date(query.from);
      if (query.to) allPaymentsWhere.createdAt.lte = new Date(query.to);
    }

    const [payments, debtors] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        include: {
          student: {
            select: {
              fullName: true,
              phone: true,
              groups: {
                orderBy: { joinedAt: 'asc' },
                select: { group: { select: { name: true } } },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.student.findMany({
        where: {
          isActive: true,
          payments: {
            none: {
              status: PaymentStatus.CONFIRMED,
              createdAt: {
                gte: new Date(
                  new Date().getFullYear(),
                  new Date().getMonth(),
                  1,
                ),
              },
            },
          },
        },
        include: {
          groups: {
            orderBy: { joinedAt: 'asc' },
            select: {
              monthlyFee: true,
              group: {
                select: { name: true, teacher: { select: { fullName: true } } },
              },
            },
          },
          parents: {
            select: { parent: { select: { fullName: true, phone: true } } },
          },
        },
        orderBy: { fullName: 'asc' },
      }),
    ]);

    const statusLabels: Record<string, string> = {
      PENDING: 'Ожидает',
      CONFIRMED: 'Подтверждён',
      REJECTED: 'Отклонён',
    };
    const statusColors: Record<string, string> = {
      Подтверждён: 'FFD1FAE5',
      Ожидает: 'FFFEF9C3',
      Отклонён: 'FFFEE2E2',
    };

    const wb = new ExcelJS.Workbook();
    wb.creator = 'MathCenter';

    // Sheet 1 — Все оплаты
    const wsAll = wb.addWorksheet('Все оплаты');
    wsAll.columns = [
      { header: '№', key: 'num', width: 6 },
      { header: 'Ученик', key: 'student', width: 28 },
      { header: 'Телефон', key: 'phone', width: 18 },
      { header: 'Группа', key: 'group', width: 20 },
      { header: 'Сумма', key: 'amount', width: 14 },
      { header: 'Статус', key: 'status', width: 16 },
      { header: 'Дата создания', key: 'createdAt', width: 18 },
      { header: 'Дата подтверждения', key: 'confirmedAt', width: 22 },
    ];
    headerStyle(wsAll, 1, 8);

    payments.forEach((p, i) => {
      const label = statusLabels[p.status] ?? p.status;
      const groupNames = p.student.groups.map((link) => link.group.name);
      const row = wsAll.addRow({
        num: i + 1,
        student: p.student.fullName,
        phone: p.student.phone ?? '—',
        group: groupNames.length === 0 ? '—' : groupNames.join(', '),
        amount: Number(p.amount),
        status: label,
        createdAt: fmtDate(p.createdAt),
        confirmedAt: fmtDate(p.confirmedAt),
      });
      const bg = statusColors[label] ?? 'FFFFFFFF';
      row.eachCell({ includeEmpty: true }, (cell, col) => {
        if (col > 8) return;
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: bg },
        };
        if (col === 5) {
          cell.numFmt = '#,##0.00 "сум"';
          cell.alignment = { horizontal: 'right' };
        }
      });
    });

    const totalConfirmed = payments
      .filter((p) => p.status === PaymentStatus.CONFIRMED)
      .reduce((s, p) => s + Number(p.amount), 0);
    const totalRow = wsAll.addRow({
      num: '',
      student: 'ИТОГО подтверждённых',
      phone: '',
      group: '',
      amount: totalConfirmed,
      status: '',
      createdAt: '',
      confirmedAt: '',
    });
    totalRow.font = { bold: true };
    totalRow.getCell(5).numFmt = '#,##0.00 "сум"';
    wsAll.autoFilter = { from: 'A1', to: 'H1' };

    // Sheet 2 — Должники
    const wsDebt = wb.addWorksheet('Должники');
    wsDebt.columns = [
      { header: '№', key: 'num', width: 6 },
      { header: 'Ученик', key: 'student', width: 28 },
      { header: 'Телефон', key: 'phone', width: 18 },
      { header: 'Группа', key: 'group', width: 20 },
      { header: 'Учитель', key: 'teacher', width: 24 },
      { header: 'Ежемес. взнос', key: 'fee', width: 16 },
      { header: 'Родитель', key: 'parent', width: 24 },
      { header: 'Тел. родителя', key: 'parentPhone', width: 18 },
    ];
    headerStyle(wsDebt, 1, 8);

    debtors.forEach((s, i) => {
      // Aggregate every group enrollment into a single debtor row.
      const groupNames = s.groups.map((link) => link.group.name);
      const teacherNames = Array.from(
        new Set(s.groups.map((link) => link.group.teacher.fullName)),
      );
      const fee = s.groups.reduce(
        (acc, link) => acc + Number(link.monthlyFee),
        0,
      );
      wsDebt
        .addRow({
          num: i + 1,
          student: s.fullName,
          phone: s.phone ?? '—',
          group: groupNames.length === 0 ? '—' : groupNames.join(', '),
          teacher: teacherNames.length === 0 ? '—' : teacherNames.join(', '),
          fee,
          parent: s.parents?.[0]?.parent?.fullName ?? '—',
          parentPhone: s.parents?.[0]?.parent?.phone ?? '—',
        })
        .getCell(6).numFmt = '#,##0.00 "сум"';
    });
    wsDebt.autoFilter = { from: 'A1', to: 'H1' };

    // Sheet 3 — Сводка
    const wsSummary = wb.addWorksheet('Сводка');
    wsSummary.columns = [
      { header: 'Показатель', key: 'label', width: 32 },
      { header: 'Значение', key: 'value', width: 20 },
    ];
    headerStyle(wsSummary, 1, 2);

    const totalPending = payments
      .filter((p) => p.status === PaymentStatus.PENDING)
      .reduce((s, p) => s + Number(p.amount), 0);
    const totalRejected = payments
      .filter((p) => p.status === PaymentStatus.REJECTED)
      .reduce((s, p) => s + Number(p.amount), 0);

    [
      { label: 'Всего оплат', value: payments.length },
      {
        label: 'Подтверждено (кол-во)',
        value: payments.filter((p) => p.status === PaymentStatus.CONFIRMED)
          .length,
      },
      {
        label: 'Ожидает (кол-во)',
        value: payments.filter((p) => p.status === PaymentStatus.PENDING)
          .length,
      },
      {
        label: 'Отклонено (кол-во)',
        value: payments.filter((p) => p.status === PaymentStatus.REJECTED)
          .length,
      },
      { label: 'Сумма подтверждённых', value: totalConfirmed },
      { label: 'Сумма ожидающих', value: totalPending },
      { label: 'Сумма отклонённых', value: totalRejected },
      { label: 'Должники (текущий месяц)', value: debtors.length },
      { label: 'Дата отчёта', value: fmtDate(new Date()) },
    ].forEach((row) => {
      const r = wsSummary.addRow(row);
      const val = r.getCell(2);
      if (typeof row.value === 'number' && row.label.includes('Сумма')) {
        val.numFmt = '#,##0.00 "сум"';
      }
    });

    const buf = await wb.xlsx.writeBuffer();
    return Buffer.from(buf);
  }

  // ── FINANCE PDF ──────────────────────────────────────────────────────────

  async financePdf(query: PaymentsReportQueryDto): Promise<Buffer> {
    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.groupId) {
      where.student = { groups: { some: { groupId: query.groupId } } };
    }
    if (query.from || query.to) {
      where.createdAt = {};
      if (query.from) where.createdAt.gte = new Date(query.from);
      if (query.to) where.createdAt.lte = new Date(query.to);
    }

    const payments = await this.prisma.payment.findMany({
      where,
      include: {
        student: {
          select: {
            fullName: true,
            groups: {
              orderBy: { joinedAt: 'asc' },
              select: { group: { select: { name: true } } },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({
        margin: 40,
        size: 'A4',
        layout: 'landscape',
      });
      setupCyrillicFonts(doc);
      const chunks: Buffer[] = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc
        .fontSize(16)
        .font('bold')
        .text('MathCenter — Финансовый отчёт', { align: 'center' });
      if (query.from || query.to) {
        doc
          .fontSize(10)
          .font('body')
          .text(
            `Период: ${query.from ? fmtDate(query.from) : '—'} — ${query.to ? fmtDate(query.to) : '—'}`,
            { align: 'center' },
          );
      }
      doc
        .moveDown(0.5)
        .fontSize(10)
        .text(`Сформирован: ${fmtDate(new Date())}`, { align: 'right' })
        .moveDown(1);

      const colW = [30, 180, 120, 90, 90, 110, 130];
      const cols = [
        '№',
        'Ученик',
        'Группа',
        'Сумма',
        'Статус',
        'Создан',
        'Подтверждён',
      ];
      const startX = doc.page.margins.left;
      let y = doc.y;

      doc
        .rect(
          startX,
          y,
          colW.reduce((a, b) => a + b, 0),
          20,
        )
        .fill('#4F46E5');
      doc.fillColor('white').fontSize(9).font('bold');
      let x = startX;
      cols.forEach((c, i) => {
        doc.text(c, x + 3, y + 5, { width: colW[i] - 6, align: 'center' });
        x += colW[i];
      });
      doc.fillColor('black').font('body').fontSize(8);
      y += 20;

      const statusLabels: Record<string, string> = {
        PENDING: 'Ожидает',
        CONFIRMED: 'Подтверждён',
        REJECTED: 'Отклонён',
      };

      payments.forEach((p, i) => {
        if (y > doc.page.height - 80) {
          doc.addPage();
          y = doc.page.margins.top;
        }
        const bg = i % 2 === 0 ? '#F8FAFC' : '#FFFFFF';
        doc
          .rect(
            startX,
            y,
            colW.reduce((a, b) => a + b, 0),
            18,
          )
          .fill(bg);
        doc.fillColor('#1E293B');

        const groupNames = p.student.groups.map((link) => link.group.name);
        const cells = [
          String(i + 1),
          p.student.fullName,
          groupNames.length === 0 ? '—' : groupNames.join(', '),
          `${Number(p.amount).toLocaleString('ru-RU')} сум`,
          statusLabels[p.status] ?? p.status,
          fmtDate(p.createdAt),
          fmtDate(p.confirmedAt),
        ];
        x = startX;
        cells.forEach((c, ci) => {
          doc.text(c, x + 3, y + 4, {
            width: colW[ci] - 6,
            align: ci === 3 ? 'right' : 'left',
            lineBreak: false,
          });
          x += colW[ci];
        });
        y += 18;
      });

      const confirmed = payments
        .filter((p) => p.status === PaymentStatus.CONFIRMED)
        .reduce((s, p) => s + Number(p.amount), 0);
      doc
        .moveDown(1)
        .font('bold')
        .fontSize(10)
        .text(
          `Итого подтверждённых: ${confirmed.toLocaleString('ru-RU')} сум`,
          { align: 'right' },
        );

      doc.end();
    });
  }

  // ── PAYMENTS PDF (legacy alias) ──────────────────────────────────────────

  async paymentsPdf(query: PaymentsReportQueryDto): Promise<Buffer> {
    return this.financePdf(query);
  }

  // ── STUDENTS EXCEL ───────────────────────────────────────────────────────

  async studentsExcel(query: StudentsReportQueryDto): Promise<Buffer> {
    const where: any = {};
    if (query.groupId) {
      where.groups = { some: { groupId: query.groupId } };
    }
    if (query.isActive !== undefined)
      where.isActive = query.isActive === 'false' ? false : true;

    const students = await this.prisma.student.findMany({
      where,
      include: {
        groups: {
          orderBy: { joinedAt: 'asc' },
          select: {
            monthlyFee: true,
            group: {
              select: { name: true, teacher: { select: { fullName: true } } },
            },
          },
        },
        parents: {
          select: { parent: { select: { fullName: true, phone: true } } },
        },
      },
      orderBy: { fullName: 'asc' },
    });

    const wb = new ExcelJS.Workbook();
    wb.creator = 'MathCenter';
    const ws = wb.addWorksheet('Ученики');

    ws.columns = [
      { header: '№', key: 'num', width: 6 },
      { header: 'ФИО', key: 'fullName', width: 28 },
      { header: 'Телефон', key: 'phone', width: 18 },
      { header: 'Группа', key: 'group', width: 20 },
      { header: 'Учитель', key: 'teacher', width: 24 },
      { header: 'Ежемес. оплата', key: 'monthlyFee', width: 18 },
      { header: 'Родитель', key: 'parent', width: 24 },
      { header: 'Тел. родителя', key: 'parentPhone', width: 18 },
      { header: 'Зачислен', key: 'enrolledAt', width: 16 },
      { header: 'Статус', key: 'status', width: 12 },
    ];

    headerStyle(ws, 1, 10);

    students.forEach((s, i) => {
      const groupNames = s.groups.map((link) => link.group.name);
      const teacherNames = Array.from(
        new Set(s.groups.map((link) => link.group.teacher.fullName)),
      );
      const monthlyFee = s.groups.reduce(
        (acc, link) => acc + Number(link.monthlyFee),
        0,
      );
      const row = ws.addRow({
        num: i + 1,
        fullName: s.fullName,
        phone: s.phone ?? '—',
        group: groupNames.length === 0 ? '—' : groupNames.join(', '),
        teacher: teacherNames.length === 0 ? '—' : teacherNames.join(', '),
        monthlyFee,
        parent: s.parents?.[0]?.parent?.fullName ?? '—',
        parentPhone: s.parents?.[0]?.parent?.phone ?? '—',
        enrolledAt: fmtDate(s.enrolledAt),
        status: s.isActive ? 'Активен' : 'Неактивен',
      });
      row.getCell(6).numFmt = '#,##0.00 "сум"';
      if (!s.isActive) {
        row.eachCell({ includeEmpty: true }, (cell, col) => {
          if (col > 10) return;
          cell.font = { color: { argb: 'FF94A3B8' } };
        });
      }
    });

    ws.autoFilter = { from: 'A1', to: 'J1' };

    const buf = await wb.xlsx.writeBuffer();
    return Buffer.from(buf);
  }

  // ── ATTENDANCE EXCEL (with summary sheet) ────────────────────────────────

  async attendanceExcel(query: AttendanceReportQueryDto): Promise<Buffer> {
    const where: any = {};
    if (query.groupId) where.groupId = query.groupId;
    if (query.from || query.to) {
      where.date = {};
      if (query.from) where.date.gte = new Date(query.from);
      if (query.to) where.date.lte = new Date(query.to);
    }

    const records = await this.prisma.attendance.findMany({
      where,
      include: {
        student: { select: { fullName: true } },
        group: { select: { name: true } },
      },
      orderBy: [{ date: 'desc' }, { student: { fullName: 'asc' } }],
    });

    const wb = new ExcelJS.Workbook();
    wb.creator = 'MathCenter';

    // Sheet 1 — detail
    const ws = wb.addWorksheet('Посещаемость');
    ws.columns = [
      { header: '№', key: 'num', width: 6 },
      { header: 'Ученик', key: 'student', width: 28 },
      { header: 'Группа', key: 'group', width: 20 },
      { header: 'Дата', key: 'date', width: 14 },
      { header: 'Тип занятия', key: 'lessonType', width: 16 },
      { header: 'Статус', key: 'status', width: 18 },
    ];

    headerStyle(ws, 1, 6);

    const statusLabels: Record<string, string> = {
      PRESENT: 'Присутствовал',
      ABSENT: 'Отсутствовал',
      LATE: 'Опоздал',
    };
    const lessonLabels: Record<string, string> = {
      REGULAR: 'Обычное',
      PRACTICE: 'Практика',
      CONTROL: 'Контрольная',
      TEST: 'Тест',
    };

    records.forEach((r, i) => {
      const statusLabel = statusLabels[r.status] ?? r.status;
      const row = ws.addRow({
        num: i + 1,
        student: r.student.fullName,
        group: r.group.name,
        date: fmtDate(r.date),
        lessonType: lessonLabels[r.lessonType] ?? r.lessonType,
        status: statusLabel,
      });

      const statusColors: Record<string, string> = {
        Присутствовал: 'FFD1FAE5',
        Опоздал: 'FFFEF9C3',
        Отсутствовал: 'FFFEE2E2',
      };
      const bg = statusColors[statusLabel] ?? 'FFFFFFFF';
      row.getCell(6).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: bg },
      };
    });

    ws.autoFilter = { from: 'A1', to: 'F1' };

    // Sheet 2 — Сводка по группам
    const wsSummary = wb.addWorksheet('Сводка по группам');
    wsSummary.columns = [
      { header: 'Группа', key: 'group', width: 24 },
      { header: 'Всего записей', key: 'total', width: 16 },
      { header: 'Присутствовал', key: 'present', width: 16 },
      { header: 'Опоздал', key: 'late', width: 14 },
      { header: 'Отсутствовал', key: 'absent', width: 16 },
      { header: 'Посещаемость %', key: 'pct', width: 18 },
    ];
    headerStyle(wsSummary, 1, 6);

    const byGroup = new Map<
      string,
      { present: number; late: number; absent: number }
    >();
    for (const r of records) {
      const entry = byGroup.get(r.group.name) ?? {
        present: 0,
        late: 0,
        absent: 0,
      };
      if (r.status === 'PRESENT') entry.present++;
      else if (r.status === 'LATE') entry.late++;
      else entry.absent++;
      byGroup.set(r.group.name, entry);
    }

    for (const [groupName, counts] of byGroup) {
      const total = counts.present + counts.late + counts.absent;
      const pct =
        total > 0
          ? Math.round(((counts.present + counts.late) / total) * 100)
          : 0;
      const row = wsSummary.addRow({
        group: groupName,
        total,
        present: counts.present,
        late: counts.late,
        absent: counts.absent,
        pct: `${pct}%`,
      });
      const pctCell = row.getCell(6);
      pctCell.font = {
        bold: true,
        color: {
          argb: pct >= 80 ? 'FF16A34A' : pct >= 60 ? 'FFD97706' : 'FFDC2626',
        },
      };
    }

    const buf = await wb.xlsx.writeBuffer();
    return Buffer.from(buf);
  }

  // ── GRADES EXCEL ─────────────────────────────────────────────────────────

  async gradesExcel(query: DateRangeQueryDto): Promise<Buffer> {
    const where: any = {};
    if (query.from || query.to) {
      where.createdAt = {};
      if (query.from) where.createdAt.gte = new Date(query.from);
      if (query.to) where.createdAt.lte = new Date(query.to);
    }

    const grades = await this.prisma.grade.findMany({
      where,
      include: {
        student: { select: { fullName: true } },
        // The grade itself is bound to a specific group/lesson — use that
        // instead of trying to derive it from the student's enrollments.
        group: {
          select: { name: true, teacher: { select: { fullName: true } } },
        },
      },
      orderBy: [{ student: { fullName: 'asc' } }, { createdAt: 'desc' }],
    });

    const wb = new ExcelJS.Workbook();
    wb.creator = 'MathCenter';

    // Sheet 1 — Оценки
    const wsGrades = wb.addWorksheet('Оценки');
    wsGrades.columns = [
      { header: '№', key: 'num', width: 6 },
      { header: 'Ученик', key: 'student', width: 28 },
      { header: 'Группа', key: 'group', width: 20 },
      { header: 'Учитель', key: 'teacher', width: 24 },
      { header: 'Тип занятия', key: 'lessonType', width: 20 },
      { header: 'Балл', key: 'score', width: 10 },
      { header: 'Макс. балл', key: 'maxScore', width: 12 },
      { header: '%', key: 'pct', width: 8 },
      { header: 'Дата', key: 'date', width: 14 },
    ];
    headerStyle(wsGrades, 1, 9);

    const lessonTypeLabels: Record<string, string> = {
      REGULAR: 'Обычное',
      PRACTICE: 'Практика',
      CONTROL: 'Контрольная',
      TEST: 'Тест',
    };

    grades.forEach((g, i) => {
      const score = Number(g.score);
      const maxScore = Number(g.maxScore);
      const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
      const row = wsGrades.addRow({
        num: i + 1,
        student: g.student.fullName,
        group: g.group?.name ?? '—',
        teacher: g.group?.teacher?.fullName ?? '—',
        lessonType: lessonTypeLabels[g.lessonType] ?? g.lessonType,
        score,
        maxScore,
        pct: `${pct}%`,
        date: fmtDate(g.date),
      });
      // colour the pct cell
      const pctCell = row.getCell(8);
      pctCell.font = {
        color: {
          argb: pct >= 80 ? 'FF16A34A' : pct >= 60 ? 'FFD97706' : 'FFDC2626',
        },
      };
    });
    wsGrades.autoFilter = { from: 'A1', to: 'I1' };

    // Sheet 2 — Рейтинг
    const wsRating = wb.addWorksheet('Рейтинг');
    wsRating.columns = [
      { header: '#', key: 'rank', width: 6 },
      { header: 'Ученик', key: 'student', width: 28 },
      { header: 'Группа', key: 'group', width: 20 },
      { header: 'Работ', key: 'total', width: 10 },
      { header: 'Средний балл %', key: 'avg', width: 18 },
    ];
    headerStyle(wsRating, 1, 5);

    const studentMap = new Map<
      string,
      { name: string; group: string; scores: number[] }
    >();
    for (const g of grades) {
      const score = Number(g.score);
      const maxScore = Number(g.maxScore);
      const pct = maxScore > 0 ? (score / maxScore) * 100 : 0;
      const entry = studentMap.get(g.studentId) ?? {
        name: g.student.fullName,
        group: g.group?.name ?? '—',
        scores: [],
      };
      entry.scores.push(pct);
      studentMap.set(g.studentId, entry);
    }

    const ranking = Array.from(studentMap.values())
      .map((s) => ({
        ...s,
        avg: Math.round(s.scores.reduce((a, b) => a + b, 0) / s.scores.length),
      }))
      .sort((a, b) => b.avg - a.avg);

    ranking.forEach((s, i) => {
      const row = wsRating.addRow({
        rank: i + 1,
        student: s.name,
        group: s.group,
        total: s.scores.length,
        avg: `${s.avg}%`,
      });
      row.getCell(5).font = {
        bold: i < 3,
        color: {
          argb:
            s.avg >= 80 ? 'FF16A34A' : s.avg >= 60 ? 'FFD97706' : 'FFDC2626',
        },
      };
    });

    const buf = await wb.xlsx.writeBuffer();
    return Buffer.from(buf);
  }

  // ── SALARY EXCEL ─────────────────────────────────────────────────────────

  async salaryExcel(query: DateRangeQueryDto): Promise<Buffer> {
    const teachers = await this.prisma.teacher.findMany({
      where: { isActive: true },
      include: {
        groups: {
          where: { isActive: true },
          include: {
            _count: {
              select: {
                students: { where: { student: { isActive: true } } },
              },
            },
            attendances:
              query.from || query.to
                ? {
                    where: {
                      date: {
                        gte: query.from ? new Date(query.from) : undefined,
                        lte: query.to ? new Date(query.to) : undefined,
                      },
                    },
                    select: { status: true },
                  }
                : { select: { status: true } },
          },
        },
      },
      orderBy: { fullName: 'asc' },
    });

    const wb = new ExcelJS.Workbook();
    wb.creator = 'MathCenter';
    const ws = wb.addWorksheet('Зарплаты');

    ws.columns = [
      { header: '№', key: 'num', width: 6 },
      { header: 'Учитель', key: 'fullName', width: 28 },
      { header: 'Телефон', key: 'phone', width: 18 },
      { header: 'Групп', key: 'groups', width: 10 },
      { header: 'Учеников', key: 'students', width: 12 },
      { header: 'Ставка / уч.', key: 'rate', width: 16 },
      { header: 'Посещ. %', key: 'att', width: 12 },
      { header: 'К выплате', key: 'salary', width: 16 },
    ];
    headerStyle(ws, 1, 8);

    let grandTotal = 0;

    teachers.forEach((t, i) => {
      const studentCount = t.groups.reduce((s, g) => s + g._count.students, 0);
      const rate = Number(t.ratePerStudent);
      const totalSalary = studentCount * rate;
      grandTotal += totalSalary;

      const allAtt = t.groups.flatMap((g) => g.attendances);
      const attPct =
        allAtt.length > 0
          ? Math.round(
              (allAtt.filter((a) => a.status !== 'ABSENT').length /
                allAtt.length) *
                100,
            )
          : 0;

      const row = ws.addRow({
        num: i + 1,
        fullName: t.fullName,
        phone: t.phone ?? '—',
        groups: t.groups.length,
        students: studentCount,
        rate,
        att: `${attPct}%`,
        salary: totalSalary,
      });
      row.getCell(6).numFmt = '#,##0 "сум"';
      row.getCell(8).numFmt = '#,##0 "сум"';
      row.getCell(8).font = { bold: true };
    });

    const totalRow = ws.addRow({
      num: '',
      fullName: 'ИТОГО',
      phone: '',
      groups: '',
      students: '',
      rate: '',
      att: '',
      salary: grandTotal,
    });
    totalRow.font = { bold: true };
    totalRow.getCell(8).numFmt = '#,##0 "сум"';
    totalRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFEde9fe' },
    };

    const buf = await wb.xlsx.writeBuffer();
    return Buffer.from(buf);
  }
}
