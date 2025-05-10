import { TopicId } from "@hashgraph/sdk";
import { createBaseMirrorNodeApiUrl } from "../../../utils/api-utils";
import { TopicInfoApiResponse, HederaNetworkType } from "../../../types";

export const get_topic_info = async (
    topicId: TopicId,
    networkType: HederaNetworkType
): Promise<TopicInfoApiResponse> => {
    const baseUrl = createBaseMirrorNodeApiUrl(networkType)
    const url = `${baseUrl}/api/v1/topics/${topicId.toString()}`;

    const response = await fetch(url);
    const data: TopicInfoApiResponse = await response.json();

    if (!data) {
        throw new Error("Could not find or fetch topic info");
    }

    return data;
}