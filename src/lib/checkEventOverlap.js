const checkEventOverlap = (sessions) => {
  sessions.sort((a, b) => a.startsAt - b.startsAt);

  // Iterate through the sorted events
  for (let i = 1; i < sessions.length; i++) {
    // Check if the current event overlaps with the previous event
    if (sessions[i].startsAt < sessions[i - 1].endsAt) {
      return [sessions[i - 1], sessions[i]];
    }
  }

  return false;
};

export default checkEventOverlap;
