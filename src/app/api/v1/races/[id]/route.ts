import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabaseClient';

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const athleteId = request.cookies.get('strava_athlete_id')?.value;
    const { id } = await params;

    if (!athleteId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!id) {
        return NextResponse.json({ error: 'Race ID is required' }, { status: 400 });
    }

    const { error } = await supabase
        .from('races')
        .delete()
        .eq('id', id)
        .eq('user_id', athleteId); // Ensure user owns the race

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
