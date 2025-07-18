import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { clerkId: userId }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if property exists and belongs to user
    const property = await prisma.property.findUnique({
      where: { 
        id,
        userId: user.id,
        deletedAt: null // Only find non-deleted properties
      }
    });

    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    // Soft delete the property
    await prisma.property.update({
      where: { id },
      data: { deletedAt: new Date() }
    });

    return NextResponse.json({
      success: true,
      message: "Property deleted successfully"
    });
  } catch (error) {
    console.error("❌ Error deleting property:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}