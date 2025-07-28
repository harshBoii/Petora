import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import getClient from '@/lib/mongodb';

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const client = await getClient;
    const db = client.db();

    if (!ObjectId.isValid(params.id)) {
      return NextResponse.json({ message: 'Invalid group ID' }, { status: 400 });
    }

    const result = await db.collection('groups').deleteOne({
      _id: new ObjectId(params.id),
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ message: 'Group not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Group deleted successfully' });

  } catch (error) {
    console.error('Failed to delete group:', error);
    return NextResponse.json({ message: 'Failed to delete group' }, { status: 500 });
  }
}
