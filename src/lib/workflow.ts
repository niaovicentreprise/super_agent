import { hostedMcpTool, Agent, AgentInputItem, Runner, withTrace } from "@openai/agents";
import { z } from "zod";

type WorkflowInput = { 
  input_as_text: string
  workflowId: string;
  zapierToken: string;
};

const conversationHistory: AgentInputItem[] = [];

// Main code entrypoint
export const runWorkflow = async (workflow: WorkflowInput) => {
  const mcp = hostedMcpTool({
    serverLabel: "zapier",
    allowedTools: [
      "add_tools",
      "edit_tools",
      "linkedin_create_share_update"
    ],
    // MDJmMTAxODktN2RhOC00MzlmLWE0YzYtMGY5ZWM4NTcwODMyOmQ1ODEzZmQzLTVkYTEtNGVhMS1hZDI0LTYwMWY4ZDBkYzQ2NQ==
    authorization: workflow.zapierToken,
    requireApproval: "never",
    serverUrl: "https://mcp.zapier.com/api/mcp/mcp"
  })

  const linkedinPublisher = new Agent({
    name: "Linkedin publisher",
    instructions: "Tu es un specialiste Linkedin",
    model: "gpt-4.1",
    tools: [
      mcp
    ],
    modelSettings: {
      temperature: 1,
      topP: 1,
      maxTokens: 2048,
      store: true
    }
  });

  // Firecrawl
  const mcp1 = hostedMcpTool({
    serverLabel: "test",
    allowedTools: [
      "firecrawl_scrape",
      "firecrawl_map",
      "firecrawl_search",
      "firecrawl_crawl",
      "firecrawl_check_crawl_status",
      "firecrawl_extract"
    ],
    requireApproval: "never",
    serverUrl: "https://mcp.firecrawl.dev/fc-65f13a9cda3742a790e579facb1a9534/v2/mcp"
  })

  // Image Generator
  const mcp2 = hostedMcpTool({
    serverLabel: "test",
    allowedTools: [
      "generate_and_upload_image"
    ],
    requireApproval: "never",
    serverUrl: "https://vitreous-coffee-hookworm.fastmcp.app/mcp"
  })

  // Audio Generator - TTS
  const mcp3 = hostedMcpTool({
    serverLabel: "test",
    allowedTools: [
      "generate_podcast_audio"
    ],
    requireApproval: "never",
    serverUrl: "https://vitreous-coffee-hookworm.fastmcp.app/mcp"
  })

  const OrchestrateurSchema = z.object({ category: z.enum(["linkedin", "scrapping", "images", "podcast", "general"]) });

  const orchestrateur = new Agent({
    name: "Orchestrateur ",
    instructions: `Tu es un spécialiste de la classification des demandes des utilisateurs
      1-la demande du client est en relation avec la publication Linkedin ,tu Donnes en output \"linkedin\"
      2-la demande du client est en relation avec la le Scrapping du Web ,tu Donnes en output \"scrapping\"
      3-la demande du client est en relation avec la la génération d'images ,d'illustrations ou de logos  ,alors tu Donnes en output \"images\".
      4-la demande du client est en relation avec la la création d'un Podcast ,alors tu Donnes en output \"podcast\".
      5-la demande du client est d'ordres general lors tu Donnes en output \"general\".`,
    model: "o1",
    outputType: OrchestrateurSchema,
    modelSettings: {
      reasoning: {
        effort: "medium"
      },
      store: true
    }
  });

  const scrapper = new Agent({
    name: "scrapper",
    instructions: "Tu es un assistant en extraction des infos des sites web et leur structuration.",
    model: "gpt-4.1",
    tools: [
      mcp1
    ],
    modelSettings: {
      temperature: 1,
      topP: 1,
      maxTokens: 2048,
      store: true
    }
  });

  const designer = new Agent({
    name: "designer",
    instructions: "tu es un specialiste en generation d'images,d'illustration et de logos",
    model: "gpt-4.1",
    tools: [
      mcp2
    ],
    modelSettings: {
      temperature: 1,
      topP: 1,
      maxTokens: 2048,
      store: true
    }
  });

  const podcast = new Agent({
    name: "podcast",
    instructions: "tu es un specialiste en generation des podcasts",
    model: "gpt-4.1",
    tools: [
      mcp3
    ],
    modelSettings: {
      temperature: 1,
      topP: 1,
      maxTokens: 2048,
      store: true
    }
  });

  const generaliste = new Agent({
    name: "generaliste",
    instructions: "Specialiste en salutation en connaissance generale.Adopte un ton decontracté et chaleureueux.Ai recours à l'humour de temps en temps",
    model: "gpt-4.1-nano",
    modelSettings: {
      temperature: 1,
      topP: 1,
      maxTokens: 2048,
      store: true
    }
  });

  conversationHistory.push({
    role: "user",
    content: [
      {
        type: "input_text",
        text: workflow.input_as_text
      }
    ]
  });


  return await withTrace("orchestrateur 4", async () => {
    const runner = new Runner({
      traceMetadata: {
        __trace_source__: "agent-builder",
        // wf_690f5f9f0ab881909a827b61c1d28ec60413bfe0cd29e362
        workflow_id: workflow.workflowId
      }
    });
    
    const orchestrateurResultTemp = await runner.run(
      orchestrateur,
      [
        ...conversationHistory
      ]
    );
    conversationHistory.push(...orchestrateurResultTemp.newItems.map((item) => item.rawItem));

    if (!orchestrateurResultTemp.finalOutput) {
        throw new Error("Agent result is undefined");
    }

    const orchestrateurResult = {
      output_text: JSON.stringify(orchestrateurResultTemp.finalOutput),
      output_parsed: orchestrateurResultTemp.finalOutput
    };
    
    let finalResult = "";
    
    if (orchestrateurResult.output_parsed.category == "linkedin") {
      const linkedinPublisherResultTemp = await runner.run(
        linkedinPublisher,
        [
          ...conversationHistory
        ]
      );
      conversationHistory.push(...linkedinPublisherResultTemp.newItems.map((item) => item.rawItem));

      if (!linkedinPublisherResultTemp.finalOutput) {
          throw new Error("Agent result is undefined");
      }

      const linkedinPublisherResult = {
        output_text: linkedinPublisherResultTemp.finalOutput ?? ""
      };
      finalResult = linkedinPublisherResult.output_text;
    } else if (orchestrateurResult.output_parsed.category == "scrapping") {
      const scrapperResultTemp = await runner.run(
        scrapper,
        [
          ...conversationHistory
        ]
      );
      conversationHistory.push(...scrapperResultTemp.newItems.map((item) => item.rawItem));

      if (!scrapperResultTemp.finalOutput) {
          throw new Error("Agent result is undefined");
      }

      const scrapperResult = {
        output_text: scrapperResultTemp.finalOutput ?? ""
      };
      finalResult = scrapperResult.output_text;
    } else if (orchestrateurResult.output_parsed.category == "images") {
      const designerResultTemp = await runner.run(
        designer,
        [
          ...conversationHistory
        ]
      );
      conversationHistory.push(...designerResultTemp.newItems.map((item) => item.rawItem));

      if (!designerResultTemp.finalOutput) {
          throw new Error("Agent result is undefined");
      }

      const designerResult = {
        output_text: designerResultTemp.finalOutput ?? ""
      };
      finalResult = designerResult.output_text;
    } else if (orchestrateurResult.output_parsed.category == "podcast") {
      const podcastResultTemp = await runner.run(
        podcast,
        [
          ...conversationHistory
        ]
      );
      conversationHistory.push(...podcastResultTemp.newItems.map((item) => item.rawItem));

      if (!podcastResultTemp.finalOutput) {
          throw new Error("Agent result is undefined");
      }

      const podcastResult = {
        output_text: podcastResultTemp.finalOutput ?? ""
      };
      finalResult = podcastResult.output_text;
    } else if (orchestrateurResult.output_parsed.category == "general") {
      const generalisteResultTemp = await runner.run(
        generaliste,
        [
          ...conversationHistory
        ]
      );
      conversationHistory.push(...generalisteResultTemp.newItems.map((item) => item.rawItem));

      if (!generalisteResultTemp.finalOutput) {
          throw new Error("Agent result is undefined");
      }

      const generalisteResult = {
        output_text: generalisteResultTemp.finalOutput ?? ""
      };
      finalResult = generalisteResult.output_text;
    } else {
      finalResult = orchestrateurResult.output_text;
    }
    
    return { response: finalResult };
  });
}
