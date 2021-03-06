const moment = require("moment-timezone");
const utils = require("../utils");

const TIMEZONES = {
  akt: "America/Anchorage",
  akst: "America/Anchorage",
  akdt: "America/Anchorage",
  at: "America/Puerto_Rico",
  adt: "America/Puerto_Rico",
  ast: "America/Puerto_Rico",
  ":central-time-zone:": "America/Chicago",
  ct: "America/Chicago",
  cdt: "America/Chicago",
  cst: "America/Chicago",
  ":eastern-time-zone:": "America/New_York",
  et: "America/New_York",
  edt: "America/New_York",
  est: "America/New_York",
  ":mountain-time-zone:": "America/Denver",
  mt: "America/Denver",
  mdt: "America/Denver",
  mst: "America/Denver",
  ":pacific-time-zone:": "America/Los_Angeles",
  pt: "America/Los_Angeles",
  pdt: "America/Los_Angeles",
  pst: "America/Los_Angeles",
};

const matcher = /(\d{1,2}:\d{2}\s?(am|pm)?)\s?(((ak|a|c|e|m|p)(s|d)?t)|:(eastern|central|mountain|pacific)-time-zone:)?/i;

module.exports = (robot) => {
  const { getSlackUsersInConversation, postEphemeralMessage } = utils.setup(
    robot
  );

  robot.hear(matcher, async (msg) => {
    const { text, thread_ts: thread } = msg.message.rawMessage;
    if (!matcher.test(text)) {
      return;
    }
    let users = (await getSlackUsersInConversation(msg.message.room))
    let m = null;
    let ampm = null;

    const matches = [...text.matchAll(RegExp(matcher, "gi"))];
    matches.forEach(([, time, ampmStr, timezone]) => {
      const sourceTz = timezone
        ? TIMEZONES[timezone.toLowerCase()]
        : msg.message.user.slack.tz;

      if (m === null) {
        ampm = ampmStr;
        m = moment.tz(
          `${time.trim()}${ampm ? ` ${ampm}` : ""}`,
          "hh:mm a",
          sourceTz
        );
      }

      users = users.filter(({ deleted, id, is_bot: bot, tz }) => {
        if (deleted || bot) {
          return false;
        }

        // If the timezone was specified in the message, filter out the people
        // who are in that timezone.
        if (timezone) {
          if (tz === sourceTz) {
            return false;
          }
        } else if (id === msg.message.user.id) {
          return false;
        }

        return true;
      })
      .map(({ id, tz }) => ({ id, tz }));
    })

    users.forEach(({ id, tz }) => {
      postEphemeralMessage({
        as_user: false,
        channel: msg.message.room,
        icon_emoji: ":timebot:",
        user: id,
        username: "Handy Tau-bot",
        text: `That's ${m
          .clone()
          .tz(tz)
          .format(`h:mm${ampm ? " a" : ""}`)} for you!`,
        thread_ts: thread,
      });
    });
  });
};
