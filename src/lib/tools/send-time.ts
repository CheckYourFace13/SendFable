export type AudienceKind = "consumer" | "b2b";
export type WeekPreference = "weekday" | "weekend" | "either";
export type Industry =
  | "general"
  | "restaurant"
  | "retail"
  | "professional"
  | "nonprofit"
  | "local-events";

export type SendTimeInput = {
  audience: AudienceKind;
  week: WeekPreference;
  timezone: string;
  industry: Industry;
};

export type SendWindow = {
  when: string;
  why: string;
};

export type SendTimePlan = {
  windows: SendWindow[];
  firstTest: string;
  timezoneNote: string;
  disclaimer: string;
};

const DISCLAIMER =
  "These are starting windows, not a best time. Subscriber behavior is the real guide. Send the same kind of email in two windows and keep the one people answer.";

export function planSendTimes(input: SendTimeInput): SendTimePlan {
  const zone = input.timezone.trim() || "your primary timezone";
  const windows = windowsFor(input);
  return {
    windows,
    firstTest: firstTestFor(input, windows[0]?.when ?? "the first window"),
    timezoneNote: `Times are local to ${zone}. This planner does not convert clocks or store what you entered.`,
    disclaimer: DISCLAIMER,
  };
}

function windowsFor(input: SendTimeInput): SendWindow[] {
  if (input.industry === "restaurant") {
    return [
      {
        when: "Thursday–Saturday, 3:00–5:00pm",
        why: "People are deciding dinner before the rush, not during it.",
      },
      {
        when: "Tuesday–Wednesday, 10:30–11:30am",
        why: "A second window for lunch specials and office orders. Compare it with the afternoon send.",
      },
    ];
  }

  if (input.industry === "retail") {
    return [
      {
        when: "Thursday–Saturday, 4:00–6:00pm",
        why: "Shoppers are often planning a visit or an online order after the workday.",
      },
      {
        when: "Tuesday, 10:00–11:30am",
        why: "A quieter weekday morning is a useful contrast if evening mail gets ignored.",
      },
    ];
  }

  if (input.industry === "local-events") {
    return [
      {
        when: "The day before, 4:00–6:00pm",
        why: "A reminder while people still have the evening free to decide.",
      },
      {
        when: "Midweek, 10:00–11:30am",
        why: "Use this for the first announcement, then test the day-before reminder separately.",
      },
    ];
  }

  if (input.audience === "b2b" || input.industry === "professional") {
    const weekend =
      input.week === "weekend"
        ? {
            when: "Saturday, 9:00–11:00am",
            why: "Only if your buyers actually read mail on weekends. For most offices, a weekday still wins — test that first.",
          }
        : {
            when: "Tuesday–Thursday, 1:30–3:00pm",
            why: "A second window after the morning meeting block. Skip Monday’s pile and late Friday.",
          };
    return [
      {
        when: "Tuesday–Thursday, 9:30–11:00am",
        why: "Work inboxes are open, and Monday’s overnight mail has already been triaged.",
      },
      weekend,
    ];
  }

  if (input.industry === "nonprofit") {
    return [
      {
        when: "Tuesday–Thursday, 10:00am–12:00pm",
        why: "A calm weekday morning is a fair first test for news and appeals.",
      },
      {
        when: "Tuesday–Thursday, 5:30–7:00pm",
        why: "Some supporters read after work. Compare this with the morning window before you commit.",
      },
    ];
  }

  if (input.week === "weekend") {
    return [
      {
        when: "Saturday, 9:00–11:00am",
        why: "A weekend morning reaches people who asked for consumer mail and are not in a weekday inbox.",
      },
      {
        when: "Sunday, 4:00–6:00pm",
        why: "A second window before the week starts. If Saturday wins clearly, you can drop this.",
      },
    ];
  }

  return [
    {
      when: "Tuesday–Thursday, 10:00–11:30am",
      why: "A readable weekday morning, after the Monday rush.",
    },
    {
      when: "Tuesday–Thursday, 4:00–6:00pm",
      why: "After work and before dinner. Test this against the morning window with the same kind of email.",
    },
  ];
}

function firstTestFor(input: SendTimeInput, firstWindow: string): string {
  if (input.audience === "b2b" && input.week === "weekend") {
    return "Test a Tuesday or Wednesday morning before you rely on Saturday. Weekend mail is the comparison, not the default.";
  }
  return `Send the next real email in ${firstWindow}, then repeat a similar email in the other window. Keep the one your list answers.`;
}
