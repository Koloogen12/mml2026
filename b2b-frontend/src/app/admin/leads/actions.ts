'use server';

import { revalidatePath } from 'next/cache';

import { auth } from '@/auth';
import { prisma } from '@/lib/db';

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) {
    throw new Error('unauthorized');
  }
  return session;
}

export async function toggleLeadReadAction(id: number) {
  await requireAdmin();
  const current = await prisma.leadRequest.findUnique({ where: { id } });
  if (!current) return;
  await prisma.leadRequest.update({
    where: { id },
    data: { read: !current.read }
  });
  revalidatePath('/admin/leads');
  revalidatePath('/admin');
}

export async function markAllReadAction() {
  await requireAdmin();
  await prisma.leadRequest.updateMany({
    where: { read: false },
    data: { read: true }
  });
  revalidatePath('/admin/leads');
  revalidatePath('/admin');
}

export async function deleteLeadAction(id: number) {
  await requireAdmin();
  await prisma.leadRequest.delete({ where: { id } });
  revalidatePath('/admin/leads');
  revalidatePath('/admin');
}

export async function updateLeadNotesAction(id: number, notes: string) {
  await requireAdmin();
  await prisma.leadRequest.update({
    where: { id },
    data: { notes: notes.trim() || null }
  });
  revalidatePath('/admin/leads');
}
