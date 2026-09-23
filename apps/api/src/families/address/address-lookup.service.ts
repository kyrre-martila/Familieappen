import { BadGatewayException, BadRequestException, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { FamilyAuthorizationService } from "../family-authorization.service";
import { AddressLookupUnavailableError, InvalidAddressLookupResponseError, NormalizedAddress } from "./address.domain";
import { GeonorgeClient } from "./geonorge.client";

@Injectable()
export class AddressLookupService {
  constructor(
    private readonly authorization: FamilyAuthorizationService,
    private readonly geonorge: GeonorgeClient
  ) {}

  async search(userId: string, familyId: string, query: unknown): Promise<NormalizedAddress[]> {
    await this.authorization.requireFamilyMember(userId, familyId);
    if (typeof query !== "string" || query.trim().length < 2) {
      throw new BadRequestException("Address query must contain at least two characters");
    }

    try {
      return await this.geonorge.search(query);
    } catch (error) {
      if (error instanceof AddressLookupUnavailableError) {
        throw new ServiceUnavailableException(error.message);
      }
      if (error instanceof InvalidAddressLookupResponseError) {
        throw new BadGatewayException(error.message);
      }
      throw error;
    }
  }
}
