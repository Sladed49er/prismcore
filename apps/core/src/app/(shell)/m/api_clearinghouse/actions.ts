"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import { connectCarrier, disconnectCarrier } from "@/lib/clearinghouse";

export async function connect(carrierId: string): Promise<void> {
  const tenant = await getCurrentTenant();
  await connectCarrier(tenant.id, carrierId);
  revalidatePath("/m/api_clearinghouse");
}

export async function disconnect(carrierId: string): Promise<void> {
  const tenant = await getCurrentTenant();
  await disconnectCarrier(tenant.id, carrierId);
  revalidatePath("/m/api_clearinghouse");
}
