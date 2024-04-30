require('dotenv').config();

const crypto = require('crypto');

const { updateMeetingStatus, updateMeetingAttendence } = require('../zoom-meeting-webhook-handler/slack.js');

const rooms = require('../../data/rooms.json');

const EVENT_MEETING_STARTED = 'meeting.started';
const EVENT_MEETING_ENDED = 'meeting.ended';
const EVENT_PARTICIPANT_JOINED = 'meeting.participant_joined';
const EVENT_PARTICIPANT_LEFT = 'meeting.participant_left';

const ZOOM_SECRET =
  process.env.TEST_ZOOM_WEBHOOK_SECRET_TOKEN ||
  process.env.ZOOM_WEBHOOK_SECRET_TOKEN;

const ZOOM_AUTH =
  process.env.TEST_ZOOM_WEBHOOK_AUTH || process.env.ZOOM_WEBHOOK_AUTH;

const handler = async function (event, context) {
  try {
    console.log(event)

    const request = JSON.parse(event.body);

    console.log('PRINTING REQUEST FROM handle-participant-joined-background')
    console.log(JSON.stringify(request, null, 2))

    // check our meeting ID. The meeting ID never changes, but the uuid is different for each instance

    const room = rooms.find(
      (room) => room.ZoomMeetingId === request.payload.object.id
    );

    if (room) {
      const Airtable = require('airtable');
      const base = new Airtable().base(process.env.AIRTABLE_COWORKING_BASE);

      const { findRoomInstance } = require('../zoom-meeting-webhook-handler/airtable');

          let roomInstance = await findRoomInstance(
            room,
            base,
            request.payload.object.uuid
          );

          if (roomInstance) {
            // create room event record
            console.log(`found room instance ${roomInstance.getId()}`);

            const updatedMeeting = await updateMeetingAttendence(
              room,
              roomInstance.get('slack_thread_timestamp'),
              request
            );
          }
    } else {
      console.log('meeting ID is not co-working meeting');
    }

    return {
      statusCode: 200,
      body: '',
    };
  } catch (error) {
    // output to netlify function log
    console.log(error);
    return {
      statusCode: 500,
      // Could be a custom message or object i.e. JSON.stringify(err)
      body: JSON.stringify({ msg: error.message }),
    };
  }
};

module.exports = { handler };
