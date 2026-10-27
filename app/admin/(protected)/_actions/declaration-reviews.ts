'use server';

import { revalidatePath } from 'next/cache';
import { requireOwner } from '@/core/auth/guard';
import {
  approveDeclaration,
  isOperatorEmail,
  rejectDeclaration,
  type ReviewOutcome,
} from '@/core/declarations/service';

/**
 * The operator's decisions. Each checks the session and the operator list
 * itself — the screen hiding its buttons from everyone else is not the guard.
 */

const REF = /^[A-Za-z0-9-]{4,64}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** The operator's email, or null for an owner who is not one. */
function operator(email: string): string | null {
  return isOperatorEmail(email) ? email : null;
}

export async function approveDeclarationAction(input: {
  id: string;
  mygovRef: string;
  declaredOn: string;
}): Promise<ReviewOutcome> {
  const reviewer = operator((await requireOwner()).email);
  if (!reviewer) return { ok: false, error: 'Only WebCV operators can review declarations.' };
  const ref = String(input.mygovRef ?? '').trim();
  const date = String(input.declaredOn ?? '').trim();
  if (!REF.test(ref)) return { ok: false, error: 'Enter the myGov document reference.' };
  if (!DATE.test(date) || new Date(date) > new Date()) {
    return { ok: false, error: 'Enter the date the declaration was made.' };
  }
  const result = await approveDeclaration(String(input.id), reviewer, ref, date);
  revalidatePath('/admin/declaration-reviews');
  return result;
}

export async function rejectDeclarationAction(input: {
  id: string;
  reason: string;
}): Promise<ReviewOutcome> {
  const reviewer = operator((await requireOwner()).email);
  if (!reviewer) return { ok: false, error: 'Only WebCV operators can review declarations.' };
  const reason = String(input.reason ?? '')
    .trim()
    .slice(0, 400);
  if (reason.length < 10) return { ok: false, error: 'Tell them why, so they can fix it.' };
  const result = await rejectDeclaration(String(input.id), reviewer, reason);
  revalidatePath('/admin/declaration-reviews');
  return result;
}
