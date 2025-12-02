import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabaseClient';

export async function GET(request: NextRequest) {
    const athleteId = request.cookies.get('strava_athlete_id')?.value;

    if (!athleteId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
        .from('races')
        .select('*')
        .eq('user_id', athleteId)
        .order('date', { ascending: true });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
    const athleteId = request.cookies.get('strava_athlete_id')?.value;

    if (!athleteId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { name, date } = body;

        if (!name || !date) {
            return NextResponse.json({ error: 'Name and date are required' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('races')
            .insert([
                { user_id: athleteId, name, date }
            ])
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (e) {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
}
