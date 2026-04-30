import { NextResponse } from 'next/server'

import { logger } from '@/lib/logger'
import { createServerClient } from '@/lib/supabase/server'

/**
 * Secure Public API for Project Donations
 *
 * Security Features:
 * - Uses database view with email obfuscation
 * - Only returns safe fields for public display
 * - No sensitive donor information exposed
 */
export async function GET(request: Request, props: { params: Promise<{ projectId: string }> }) {
  const params = await props.params
  const { projectId } = params
  const projectIdNum = parseInt(projectId)

  // Allow project ID 0 (Rehabilitation Center Support)
  if (isNaN(projectIdNum) || projectIdNum < 0) {
    return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 })
  }

  try {
    // Use regular server client (RLS enforced)
    const supabase = await createServerClient()

    // Fetch from secure view with obfuscated emails
    const { data: donations, error } = await supabase
      .from('public_project_donations')
      .select('*')
      .eq('project_id', projectIdNum)
      .order('donated_at', { ascending: false })
      .limit(50)

    if (error) {
      logger.error('API', 'Error fetching project donations', {
        projectId: projectIdNum,
        error: error.message,
      })
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    return NextResponse.json(donations || [])
  } catch (error) {
    logger.errorWithStack('API', 'Unexpected error in project donations', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
