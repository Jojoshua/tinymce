import { UnitTest } from '@ephox/bedrock-client';
import { document } from '@ephox/dom-globals';
import { Arr } from '@ephox/katamari';
import { PlatformDetection } from '@ephox/sand';
import { DomEvent, Element, Insert, Remove } from '@ephox/sugar';
import * as Assertions from 'ephox/agar/api/Assertions';
import { Chain } from 'ephox/agar/api/Chain';
import * as GeneralSteps from 'ephox/agar/api/GeneralSteps';
import * as Mouse from 'ephox/agar/api/Mouse';
import { Pipeline } from 'ephox/agar/api/Pipeline';
import { Step } from 'ephox/agar/api/Step';
import * as UiFinder from 'ephox/agar/api/UiFinder';

UnitTest.asynctest('MouseTest', function () {
  const success = arguments[arguments.length - 2];
  const failure = arguments[arguments.length - 1];

  const input = Element.fromTag('input');
  const container = Element.fromTag('container');

  const platform = PlatformDetection.detect();

  // Add to the DOM so focus calls happen
  Insert.append(Element.fromDom(document.body), container);

  let repository = [];

  // TODO: Free handlers.
  const handlers = Arr.bind(['mousedown', 'mouseup', 'mouseover', 'click', 'focus', 'contextmenu'], function (evt) {
    return [
      DomEvent.bind(container, evt, function () {
        repository.push('container.' + evt);
      }),
      DomEvent.bind(input, evt, function () {
        repository.push('input.' + evt);
      })
    ];
  });

  const clearRepository = Step.sync(function () {
    repository = [];
  });

  const assertRepository = function (label, expected) {
    return Step.sync(function () {
      Assertions.assertEq(label, expected, repository);
    });
  };

  const runStep = function (label, expected, step) {
    return GeneralSteps.sequence([
      clearRepository,
      step,
      assertRepository(label, expected)
    ]);
  };

  const isUnfocusedFirefox = function () {
    // Focus events are not fired until the window has focus: https://bugzilla.mozilla.org/show_bug.cgi?id=566671
    return platform.browser.isFirefox() && !document.hasFocus();
  };

  Insert.append(container, input);

  Pipeline.async({}, [
    runStep('Initial test', [], Step.pass),
    runStep(
      'sClickOn (container > input)',
      ['input.click', 'container.click'],
      Mouse.sClickOn(container, 'input')
    ),

    runStep('point test', [ 'container.click' ], Step.sync(() => Mouse.point('click', 0, container, 0, 0))),

    runStep(
      'sTrueClickOn (container > input)',
      // IE seems to fire input.focus at the end.
      platform.browser.isIE() ? [
        'input.mousedown', 'container.mousedown',
        'input.mouseup', 'container.mouseup',
        'input.click', 'container.click', 'input.focus'

      ] : (isUnfocusedFirefox() ? [
        'input.mousedown', 'container.mousedown',
        'input.mouseup', 'container.mouseup',
        'input.click', 'container.click'
      ] : [
          'input.focus',
          'input.mousedown', 'container.mousedown',
          'input.mouseup', 'container.mouseup',
          'input.click', 'container.click'
        ]),
      Mouse.sTrueClickOn(container, 'input')
    ),

    // Running again won't call focus
    runStep(
      'sTrueClickOn (container > input)',
      [
        'input.mousedown', 'container.mousedown',
        'input.mouseup', 'container.mouseup',
        'input.click', 'container.click'
      ],
      Mouse.sTrueClickOn(container, 'input')
    ),

    runStep(
      'sHoverOn (container > input)',
      ['input.mouseover', 'container.mouseover'],
      Mouse.sHoverOn(container, 'input')
    ),

    runStep(
      'sContextMenu (container > input)',
      ['input.contextmenu', 'container.contextmenu'],
      Mouse.sContextMenuOn(container, 'input')
    ),

    runStep(
      'cClick input',
      ['input.click', 'container.click'],
      Chain.asStep(container, [
        UiFinder.cFindIn('input'),
        Mouse.cClick
      ])
    ),

    runStep(
      'cClickOn (container > input)',
      ['input.click', 'container.click'],
      Chain.asStep(container, [
        Mouse.cClickOn('input')
      ])
    ),

    runStep(
      'cContextMenu input',
      ['input.contextmenu', 'container.contextmenu'],
      Chain.asStep(container, [
        UiFinder.cFindIn('input'),
        Mouse.cContextMenu
      ])
    )

  ], function () {
    Arr.each(handlers, function (h) { h.unbind(); });
    Remove.remove(container);
    success();
  }, function (err) {
    Arr.each(handlers, function (h) { h.unbind(); });
    failure(err);
  });
});
