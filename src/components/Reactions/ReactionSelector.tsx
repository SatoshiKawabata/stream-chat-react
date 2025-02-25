import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { isMutableRef } from './utils/utils';

import { AvatarProps, Avatar as DefaultAvatar } from '../Avatar';
import { getStrippedEmojiData, ReactionEmoji } from '../Channel/emojiData';

import { useComponentContext } from '../../context/ComponentContext';
import { useEmojiContext } from '../../context/EmojiContext';
import { useMessageContext } from '../../context/MessageContext';

import type { NimbleEmojiProps } from 'emoji-mart';
import type { ReactionResponse } from 'stream-chat';

import type {
  DefaultAttachmentType,
  DefaultChannelType,
  DefaultCommandType,
  DefaultEventType,
  DefaultMessageType,
  DefaultReactionType,
  DefaultUserType,
} from '../../types/types';

export type ReactionSelectorProps<
  Re extends DefaultReactionType = DefaultReactionType,
  Us extends DefaultUserType<Us> = DefaultUserType
> = {
  /** Additional props to be passed to the [NimbleEmoji](https://github.com/missive/emoji-mart/blob/master/src/components/emoji/nimble-emoji.js) component from `emoji-mart` */
  additionalEmojiProps?: Partial<NimbleEmojiProps>;
  /** Custom UI component to display user avatar, defaults to and accepts same props as: [Avatar](https://github.com/GetStream/stream-chat-react/blob/master/src/components/Avatar/Avatar.tsx) */
  Avatar?: React.ElementType<AvatarProps>;
  /** If true, shows the user's avatar with the reaction */
  detailedView?: boolean;
  /** Function that adds/removes a reaction on a message (overrides the function stored in `MessageContext`) */
  handleReaction?: (reactionType: string, event: React.BaseSyntheticEvent) => Promise<void>;
  /** An array of the reaction objects to display in the list */
  latest_reactions?: ReactionResponse<Re, Us>[];
  /** An object that keeps track of the count of each type of reaction on a message */
  reaction_counts?: { [key: string]: number };
  /** A list of the currently supported reactions on a message */
  reactionOptions?: ReactionEmoji[];
  /** If true, adds a CSS class that reverses the horizontal positioning of the selector */
  reverse?: boolean;
};

const UnMemoizedReactionSelector = React.forwardRef(
  <
    At extends DefaultAttachmentType = DefaultAttachmentType,
    Ch extends DefaultChannelType = DefaultChannelType,
    Co extends DefaultCommandType = DefaultCommandType,
    Ev extends DefaultEventType = DefaultEventType,
    Me extends DefaultMessageType = DefaultMessageType,
    Re extends DefaultReactionType = DefaultReactionType,
    Us extends DefaultUserType<Us> = DefaultUserType
  >(
    props: ReactionSelectorProps<Re, Us>,
    ref: React.ForwardedRef<HTMLDivElement | null>,
  ) => {
    const {
      additionalEmojiProps = {},
      Avatar: propAvatar,
      detailedView = true,
      handleReaction: propHandleReaction,
      latest_reactions: propLatestReactions,
      reaction_counts: propReactionCounts,
      reactionOptions: propReactionOptions,
      reverse = false,
    } = props;

    const { Avatar: contextAvatar } = useComponentContext<At, Ch, Co, Ev, Me, Re, Us>(
      'ReactionSelector',
    );
    const { Emoji, emojiConfig } = useEmojiContext('ReactionSelector');
    const { handleReaction: contextHandleReaction, message } = useMessageContext<
      At,
      Ch,
      Co,
      Ev,
      Me,
      Re,
      Us
    >('ReactionSelector');

    const { defaultMinimalEmojis, emojiData: fullEmojiData, emojiSetDef } = emojiConfig || {};

    const Avatar = propAvatar || contextAvatar || DefaultAvatar;
    const handleReaction = propHandleReaction || contextHandleReaction;
    const latestReactions = propLatestReactions || message?.latest_reactions || [];
    const reactionCounts = propReactionCounts || message?.reaction_counts || {};
    const reactionOptions = propReactionOptions || defaultMinimalEmojis;
    const reactionsAreCustom = !!propReactionOptions?.length;

    const emojiData = useMemo(
      () => (reactionsAreCustom ? fullEmojiData : getStrippedEmojiData(fullEmojiData)),
      [fullEmojiData, reactionsAreCustom],
    );

    const [tooltipReactionType, setTooltipReactionType] = useState<string | null>(null);
    const [tooltipPositions, setTooltipPositions] = useState<{
      arrow: number;
      tooltip: number;
    } | null>(null);

    const targetRef = useRef<HTMLDivElement | null>(null);
    const tooltipRef = useRef<HTMLDivElement | null>(null);

    const showTooltip = useCallback((event, reactionType: string) => {
      targetRef.current = event.target;
      setTooltipReactionType(reactionType);
    }, []);

    const hideTooltip = useCallback(() => {
      setTooltipReactionType(null);
      setTooltipPositions(null);
    }, []);

    useEffect(() => {
      if (tooltipReactionType) {
        const tooltip = tooltipRef.current?.getBoundingClientRect();
        const target = targetRef.current?.getBoundingClientRect();

        const container = isMutableRef(ref) ? ref.current?.getBoundingClientRect() : null;

        if (!tooltip || !target || !container) return;

        const tooltipPosition =
          tooltip.width === container.width || tooltip.x < container.x
            ? 0
            : target.left + target.width / 2 - container.left - tooltip.width / 2;

        const arrowPosition = target.x - tooltip.x + target.width / 2 - tooltipPosition;

        setTooltipPositions({
          arrow: arrowPosition,
          tooltip: tooltipPosition,
        });
      }
    }, [tooltipReactionType, ref]);

    const getUsersPerReactionType = (type: string | null) =>
      latestReactions
        .map((reaction) => {
          if (reaction.type === type) {
            return reaction.user?.name || reaction.user?.id;
          }
          return null;
        })
        .filter(Boolean);

    const getLatestUserForReactionType = (type: string | null) =>
      latestReactions.find((reaction) => reaction.type === type && !!reaction.user)?.user ||
      undefined;

    return (
      <div
        className={`str-chat__reaction-selector ${
          reverse ? 'str-chat__reaction-selector--reverse' : ''
        }`}
        data-testid='reaction-selector'
        ref={ref}
      >
        {!!tooltipReactionType && detailedView && (
          <div
            className='str-chat__reaction-selector-tooltip'
            ref={tooltipRef}
            style={{
              left: tooltipPositions?.tooltip,
              visibility: tooltipPositions ? 'visible' : 'hidden',
            }}
          >
            <div className='arrow' style={{ left: tooltipPositions?.arrow }} />
            {getUsersPerReactionType(tooltipReactionType)?.map((user, i, users) => (
              <span className='latest-user-username' key={`key-${i}-${user}`}>
                {`${user}${i < users.length - 1 ? ', ' : ''}`}
              </span>
            ))}
          </div>
        )}
        <ul className='str-chat__message-reactions-list'>
          {reactionOptions.map((reactionOption: ReactionEmoji) => {
            const latestUser = getLatestUserForReactionType(reactionOption.id);
            const count = reactionCounts && reactionCounts[reactionOption.id];

            return (
              <li
                className='str-chat__message-reactions-list-item'
                data-text={reactionOption.id}
                key={`item-${reactionOption.id}`}
                onClick={(event) => handleReaction(reactionOption.id, event)}
              >
                {!!count && detailedView && (
                  <>
                    <div
                      className='latest-user'
                      onClick={hideTooltip}
                      onMouseEnter={(e) => showTooltip(e, reactionOption.id)}
                      onMouseLeave={hideTooltip}
                    >
                      {latestUser ? (
                        <Avatar
                          image={latestUser.image}
                          name={latestUser.name}
                          size={20}
                          user={latestUser}
                        />
                      ) : (
                        <div className='latest-user-not-found' />
                      )}
                    </div>
                  </>
                )}
                {
                  <Suspense fallback={null}>
                    <Emoji
                      data={emojiData}
                      emoji={reactionOption}
                      size={20}
                      {...(reactionsAreCustom ? additionalEmojiProps : emojiSetDef)}
                    />
                  </Suspense>
                }
                {Boolean(count) && detailedView && (
                  <span className='str-chat__message-reactions-list-item__count'>
                    {count || ''}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    );
  },
);

/**
 * Component that allows a user to select a reaction.
 */
export const ReactionSelector = React.memo(
  UnMemoizedReactionSelector,
) as typeof UnMemoizedReactionSelector;
