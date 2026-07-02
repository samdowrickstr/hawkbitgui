import axiosInstance from '@/lib/axios';
import { DistributionSetType } from '@/entities/distribution-set-type';
import { CreateDistributionSetTypeInput, GetDistributionSetTypesResponse } from './distribution-set-types-service.types';
import { SoftwareModuleType } from '@/entities/software-module-type';

export class DistributionSetTypesService {
    static async fetchDistributionSetTypes(): Promise<DistributionSetType[]> {
        try {
            const response = await axiosInstance.get<GetDistributionSetTypesResponse>(`/distributionsettypes`);
            return response.data.content;
        } catch (error) {
            console.error('Failed to fetch distribution sets', error);
            throw error;
        }
    }

    static async fetchDistributionSetType(distributionSetTypeId: number): Promise<DistributionSetType> {
        try {
            const response = await axiosInstance.get<DistributionSetType>(`/distributionsettypes/${distributionSetTypeId}`);
            return response.data;
        } catch (error) {
            console.error('Failed to fetch distribution set type', error);
            throw error;
        }
    }

    static async fetchMandatoryModuleTypes(distributionSetTypeId: number): Promise<SoftwareModuleType[]> {
        try {
            const response = await axiosInstance.get<SoftwareModuleType[]>(`/distributionsettypes/${distributionSetTypeId}/mandatorymoduletypes`);
            return response.data;
        } catch (error) {
            console.error('Failed to fetch mandatory module types', error);
            throw error;
        }
    }

    static async fetchOptionalModuleTypes(distributionSetTypeId: number): Promise<SoftwareModuleType[]> {
        try {
            const response = await axiosInstance.get<SoftwareModuleType[]>(`/distributionsettypes/${distributionSetTypeId}/optionalmoduletypes`);
            return response.data;
        } catch (error) {
            console.error('Failed to fetch optional module types', error);
            throw error;
        }
    }

    static async updateDistributionSetType(distributionSetTypeId: number, data: CreateDistributionSetTypeInput): Promise<DistributionSetType> {
        try {
            const response = await axiosInstance.put(`/distributionsettypes/${distributionSetTypeId}`, data);
            return response.data;
        } catch (error) {
            console.error('Failed to update distribution set type', error);
            throw error;
        }
    }

    static async createDistributionSetType(data: CreateDistributionSetTypeInput[]): Promise<DistributionSetType> {
        try {
            const response = await axiosInstance.post(`/distributionsettypes`, data);
            return response.data;
        } catch (error) {
            console.error('Failed to create distribution set type', error);
            throw error;
        }
    }
}
